from __future__ import annotations
from fastapi import FastAPI, HTTPException, Request
import logging
from typing import Optional, List, Dict
from ..config import settings
from ..models import (
    IngestRequest,
    QueryRequest,
    QueryResponse,
    ChunkRecord,
    AgentRequest,
    AgentResponse,
    CreateAgentRequest,
    CreateAgentResponse,
    RunAgentRequest,
    GenerateReportRequest,
)
from ..storage.mongo_store import MongoStore
from ..embeddings.encoder import EmbeddingEncoder
from ..retrieval.search import Retriever
from ..chunking.pdf_parser import chunk_pdf
from ..chunking.code_parser import chunk_code
from ..utils.tokenization import approximate_token_count
from ..agent.orchestrator import AgentOrchestrator
import os
from pathlib import Path
from glob import glob
from bson import ObjectId
import fitz

app = FastAPI(title="Context AI RAG + Agent Service")

logger = logging.getLogger("context_ai.api")

_mongo: Optional[MongoStore] = None
_encoder: Optional[EmbeddingEncoder] = None
_retriever: Optional[Retriever] = None
_agent: Optional[AgentOrchestrator] = None


def _ensure_components():
    global _mongo, _encoder, _retriever, _agent
    if _mongo is None:
        _mongo = MongoStore()
    if _encoder is None:
        _encoder = EmbeddingEncoder()
    if _retriever is None:
        _retriever = Retriever(_mongo, _encoder)
        if settings.vector_backend == "faiss":
            _retriever.index_all_from_mongo()
    if _agent is None and _retriever is not None:
        _agent = AgentOrchestrator(_retriever, use_langchain=getattr(settings, "use_langchain", False))


@app.get("/health")
async def health():
    _ensure_components()
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(req: IngestRequest, request: Request):
    _ensure_components()
    assert _mongo and _encoder

    try:
        client_ip = request.client.host if request.client else "unknown"
    except Exception:
        client_ip = "unknown"
    try:
        logger.info("/ingest called from %s payload=%s", client_ip, req.dict())
    except Exception:
        logger.info("/ingest called from %s (payload could not be serialized)", client_ip)

    if not req.project_id:
        raise HTTPException(400, "Provide 'project_id' in the ingest request to associate chunks with a project")

    files: List[str] = []
    temp_files: List[str] = []
    
    if req.s3_uris:
        if not settings.s3_ingest_enabled:
            logger.warning("Rejecting /ingest: s3_uris present but S3 ingest disabled in settings from %s: %s", client_ip, req.s3_uris)
            raise HTTPException(400, "S3-based ingest is disabled. Enable it by setting `S3_INGEST_ENABLED=true` in .env or provide local files via the 'files' field or a 'directory')")

        try:
            import boto3
            from botocore.exceptions import ClientError
        except ImportError:
            logger.exception("boto3 not installed but S3 ingest enabled")
            raise HTTPException(500, "Missing optional dependency 'boto3'. Install it with `pip install boto3` or `pip install -r requirements.txt`")

        session = boto3.Session(
            aws_access_key_id=settings.aws_access_key_id or os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=settings.aws_secret_access_key or os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=settings.aws_region or os.getenv('AWS_REGION', 'us-east-1'),
        )

        creds = session.get_credentials()
        if not creds or not getattr(creds, "access_key", None) or not getattr(creds, "secret_key", None):
            logger.warning("S3 ingest attempted but AWS credentials not found in settings or environment")
            raise HTTPException(500, "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env or environment, or configure AWS credentials.")

        s3_client = session.client('s3')

        temp_dir = Path(settings.s3_temp_dir)
        temp_dir.mkdir(parents=True, exist_ok=True)

        for s3_uri in req.s3_uris:
            if not s3_uri.startswith('s3://'):
                raise HTTPException(400, f"Invalid S3 URI: {s3_uri}. Must start with s3://")

            parts = s3_uri[5:].split('/', 1)
            if len(parts) != 2:
                raise HTTPException(400, f"Invalid S3 URI format: {s3_uri}")

            bucket, key = parts

            filename = os.path.basename(key)
            local_path = temp_dir / filename

            try:
                s3_client.download_file(bucket, key, str(local_path))
                files.append(str(local_path))
                temp_files.append(str(local_path))
            except ClientError as e:
                logger.exception("Failed to download %s from S3", s3_uri)
                raise HTTPException(500, f"Failed to download {s3_uri}: {str(e)}")
    
    if req.files:
        files.extend(req.files)
    elif req.directory:
        patterns = req.patterns or ["**/*"]
        for pat in patterns:
            files.extend(glob(os.path.join(req.directory, pat), recursive=req.recursive))
    
    if not files:
        logger.warning("Rejecting /ingest: no files or directory provided from %s payload=%s", client_ip, req.dict())
        raise HTTPException(400, "Provide 'files' or 'directory' to ingest from")

    processed = 0
    for path in files:
        if not os.path.isfile(path):
            continue
        ext = Path(path).suffix.lower().lstrip('.')
        language = None
        if ext == 'pdf':
            chunks = chunk_pdf(path)
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            chunks = []
            if ext in ("py", "js", "ts", "md"):
                chunks = chunk_code(path, text)
                language = 'python' if ext == 'py' else ('javascript' if ext in ('js','ts') else None)
            else:
                chunks = [{
                    "chunk_id": "0",
                    "text": text,
                    "file_ext": ext,
                    "metadata": {"token_count": approximate_token_count(text), "file_ext": ext}
                }]
        for c in chunks:
            meta = c.setdefault("metadata", {})
            meta["project_id"] = req.project_id

        doc_id = _mongo.upsert_document(source_path=path, file_ext=ext, language=language, metadata={"project_id": req.project_id})
        embeddings = _encoder.encode([c["text"] for c in chunks])
        _mongo.insert_chunks(doc_id=doc_id, source_path=path, chunks=chunks, embeddings=embeddings)
        processed += 1


    for temp_file in temp_files:
        try:
            os.remove(temp_file)
        except Exception:
            pass

    return {"processed": processed}


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    _ensure_components()
    assert _mongo and _encoder and _retriever

    filters: Dict[str, object] = {}
    if req.filters:
        if req.filters.language:
            filters["metadata.language"] = req.filters.language
        if req.filters.file_ext:
            filters["metadata.file_ext"] = req.filters.file_ext
        if req.filters.path_contains:
            filters["source_path"] = {"$regex": req.filters.path_contains}
        if req.filters.min_tokens is not None or req.filters.max_tokens is not None:
            tk = {}
            if req.filters.min_tokens is not None:
                tk["$gte"] = req.filters.min_tokens
            if req.filters.max_tokens is not None:
                tk["$lte"] = req.filters.max_tokens
            filters["metadata.token_count"] = tk

    if not req.project_id:
        raise HTTPException(400, "Provide 'project_id' in the query request to scope the search to a project")

    filters["project_id"] = req.project_id

    chunks = _retriever.retrieve(query=req.query, top_k=req.top_k, token_budget=req.token_budget or settings.default_token_budget, filters=filters)

    context_text = "\n\n".join([c["text"] for c in chunks])

    logger.info("Chunks passed as context: %s", [{"source_path": c.get("source_path"), "chunk_id": c.get("chunk_id"), "text_preview": c["text"][:100] + "..." if len(c["text"]) > 100 else c["text"]} for c in chunks])

    conversation_context = ""
    if req.user_id and settings.conversation_memory_enabled:
        try:
            query_embedding = _encoder.encode([req.query])[0].tolist()
            past_conversations = _mongo.search_conversations(
                user_id=req.user_id,
                query_embedding=query_embedding,
                top_k=settings.conversation_retrieval_top_k,
                min_score=0.3,
            )
            
            conv_texts = []
            for conv in past_conversations:
                messages = conv.get("messages", [])
                if messages:
                    conv_str = "\n".join([
                        f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}"
                        for msg in messages
                    ])
                    conv_texts.append(conv_str)
            
            if conv_texts:
                conversation_context = "\n\n--- Relevant Past Conversations ---\n" + "\n\n---\n".join(conv_texts) + "\n--- End of Past Conversations ---\n\n"
        except Exception as e:
            print(f"Error retrieving conversation history: {e}")

    full_context = conversation_context + context_text if conversation_context else context_text
    answer = await _generate_answer(req.query, full_context)

    if req.user_id and settings.conversation_memory_enabled:
        try:
            conv_messages = [
                {"role": "user", "content": req.query},
                {"role": "assistant", "content": answer},
            ]
            query_embedding = _encoder.encode([req.query])[0].tolist()
            _mongo.save_conversation(
                user_id=req.user_id,
                messages=conv_messages,
                query_embedding=query_embedding,
                metadata={"endpoint": "query"},
            )
        except Exception as e:
            print(f"Error saving conversation: {e}")

    out_chunks = [ChunkRecord(**{
        "_id": str(c["_id"]),
        "doc_id": str(c.get("doc_id")) if c.get("doc_id") else None,
        "source_path": c.get("source_path"),
        "chunk_id": c.get("chunk_id"),
        "text": c.get("text"),
        "embedding": None,  # omit in response
        "metadata": c.get("metadata", {}),
    }) for c in chunks]

    tokens_used = sum([c.metadata.get("token_count", approximate_token_count(c.text)) for c in out_chunks])

    return QueryResponse(answer=answer, context=out_chunks, used_backend=settings.vector_backend, tokens_used=tokens_used)


@app.post("/generate_report")
async def generate_report(req: GenerateReportRequest):
    """Generate a PDF report for a given project_id by concatenating project chunks."""
    _ensure_components()
    assert _mongo is not None

    if not req.project_id:
        raise HTTPException(400, "project_id is required")

    chunks = _mongo.find_chunks({"project_id": req.project_id}, limit=10000)
    if not chunks:
        raise HTTPException(404, "No chunks found for project_id")

    content = []
    for c in chunks:
        header = f"File: {c.get('source_path', '')} | Chunk: {c.get('chunk_id', '')}\n"
        content.append(header)
        content.append(c.get('text', ''))
        content.append('\n---\n')

    full_text = "\n".join(content)
    title = req.title or f"Project Report - {req.project_id}"

    out_dir = Path(settings.pdf_output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / (req.output_name or (title.replace(" ", "_") + ".pdf"))
    doc = fitz.open()
    try:
        page = doc.new_page()
        page.insert_text((72, 72), title, fontsize=18)
        y = 120
        for line in full_text.split('\n'):
            if y > 700:
                page = doc.new_page()
                y = 72
            page.insert_text((72, y), line)
            y += 12
        doc.save(str(out_path))
    finally:
        doc.close()

        try:
            try:
                import boto3
                from botocore.exceptions import ClientError
            except ImportError:
                raise HTTPException(500, "Missing optional dependency 'boto3'. Install it with `pip install boto3` or `pip install -r requirements.txt`")

            bucket = settings.s3_bucket or os.getenv("S3_BUCKET")
            if not bucket:
                bucket = f"context-ai-reports-{settings.aws_region}"

            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id or os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=settings.aws_secret_access_key or os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=settings.aws_region or os.getenv('AWS_REGION', 'us-east-1')
            )

            creds = boto3.Session().get_credentials()
            if not creds or not getattr(creds, "access_key", None) or not getattr(creds, "secret_key", None):
                raise HTTPException(500, "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables, configure the AWS CLI (aws configure), or provide an IAM role.")

            filename = os.path.basename(str(out_path))
            s3_key = f"projects/{req.project_id}/reports/{filename}"

            s3_client.upload_file(str(out_path), bucket, s3_key)
            s3_uri = f"s3://{bucket}/{s3_key}"

            return {"pdf_path": str(out_path), "s3_uri": s3_uri}
        except HTTPException:
            raise
        except Exception as e:
            return {"pdf_path": str(out_path), "s3_error": str(e)}


@app.post("/agent/complete", response_model=AgentResponse)
async def agent_complete(req: AgentRequest):
    _ensure_components()
    
    if not req.project_id:
        raise HTTPException(400, "Provide 'project_id' in the agent request to scope context search")
    
    orchestrator = AgentOrchestrator(
        _retriever,
        allowed_tools=None,
        system_prompt=None,
        project_id=req.project_id,
    )
    
    result = await orchestrator.complete(
        prompt=req.prompt,
        top_k=req.top_k,
        token_budget=req.token_budget,
    )
    return AgentResponse(answer=result["answer"], steps=result.get("steps", []))


@app.post("/agent", response_model=CreateAgentResponse)
async def create_agent(req: CreateAgentRequest):
    _ensure_components()
    assert _mongo is not None
    
    if not req.project_id:
        raise HTTPException(400, "Provide 'project_id' to associate agent with a project")
    
    doc = {
        "name": req.name,
        "description": req.description,
        "system_prompt": req.system_prompt,
        "tools": req.tools or ["search_context", "send_email", "edit_pdf", "generate_pdf_report"],
        "project_id": req.project_id,
    }
    agent_id = _mongo.save_agent(doc)
    return CreateAgentResponse(agent_id=agent_id)


@app.post("/agent/{agent_id}/run", response_model=AgentResponse)
async def run_agent(agent_id: str, req: RunAgentRequest):
    _ensure_components()
    assert _mongo is not None and _retriever is not None and _encoder is not None
    cfg = _mongo.get_agent_by_id(agent_id)
    if not cfg:
        raise HTTPException(404, "Agent not found")
    
    project_id = cfg.get("project_id")
    
    orchestrator = AgentOrchestrator(
        _retriever,
        allowed_tools=cfg.get("tools") if cfg else None,
        system_prompt=cfg.get("system_prompt") if cfg else None,
        project_id=project_id,
    )
    result = await orchestrator.complete(
        prompt=req.prompt,
        top_k=req.top_k,
        token_budget=req.token_budget,
    )
    return AgentResponse(answer=result["answer"], steps=result.get("steps", []))


async def _generate_answer(query: str, context: str) -> str:
    if settings.llm_backend == "openai":
        import os
        import httpx
        key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise HTTPException(500, "OPENAI_API_KEY not configured")
        sys_prompt = "You are a helpful assistant answering with provided context. Cite filenames or function names when relevant."
        user_prompt = f"Question: {query}\n\nContext:\n{context}"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        body = {
            "model": settings.openai_model,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": settings.max_answer_tokens,
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"].strip()
    elif settings.llm_backend == "gemini":
        import google.generativeai as genai
        from google.api_core.exceptions import ResourceExhausted
        import asyncio
        key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise HTTPException(500, "GEMINI_API_KEY not configured")
        genai.configure(api_key=key)
        model = genai.GenerativeModel(settings.gemini_model)
        sys_prompt = "You are a helpful assistant answering with provided context. Cite filenames or function names when relevant."
        user_prompt = f"Question: {query}\n\nContext:\n{context}"
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(f"{sys_prompt}\n\n{user_prompt}")
                return response.text.strip()
            except ResourceExhausted as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    logger.warning(f"Gemini rate limit hit, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Gemini quota exceeded after {max_retries} attempts: {e}")
                    raise HTTPException(429, f"LLM quota exceeded. Please wait 30s and retry. Error: {str(e)}")
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                raise HTTPException(500, f"LLM generation failed: {str(e)}")
    else:
        from transformers import pipeline
        n = min(settings.max_answer_tokens, 256)
        generator = pipeline("text2text-generation", model=settings.hf_model_name)
        prompt = f"You are a helpful assistant. Use the provided context to answer succinctly.\n\nContext:\n{context}\n\nQuestion: {query}\nAnswer:"
        out = generator(prompt, max_new_tokens=n, do_sample=True)
        return out[0]["generated_text"].strip()
