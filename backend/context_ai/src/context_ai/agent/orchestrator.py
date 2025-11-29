from __future__ import annotations
from typing import Any, Dict, List, Optional, Callable
import json
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

from ..config import settings


class AgentOrchestrator:
    """
    A lightweight agent loop that supports a single tool: `search_context`.
    - If llm_backend == "openai", uses Chat Completions tool calling.
    - Otherwise, performs a simple RAG answer in one step.

    You can inject a custom `llm_step` for testing which receives (messages, tools)
    and returns an OpenAI-like dict with either tool_calls or final content.
    """

    def __init__(
        self,
        retriever,
        llm_step: Optional[Callable[[List[Dict[str, Any]], List[Dict[str, Any]]], Dict[str, Any]]] = None,
        allowed_tools: Optional[List[str]] = None,
        system_prompt: Optional[str] = None,
        project_id: Optional[str] = None,
        use_langchain: bool = False,
    ) -> None:
        self._retriever = retriever
        self._llm_step = llm_step
        self._allowed_tools = set(allowed_tools or []) if allowed_tools else None
        self._system_prompt = system_prompt
        self._project_id = project_id
        self._use_langchain = bool(use_langchain)

    def _tool_defs(self) -> List[Dict[str, Any]]:
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "search_context",
                    "description": "Retrieve relevant context chunks from the indexed corpus.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Natural language sub-question to search for."},
                            "top_k": {"type": "integer", "minimum": 1, "maximum": 50, "default": settings.top_k},
                            "token_budget": {"type": "integer", "nullable": True, "description": "Max tokens across returned chunks."},
                        },
                        "required": ["query"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "send_email",
                    "description": "Send an email via configured SMTP server.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "to": {"type": "string"},
                            "subject": {"type": "string"},
                            "body": {"type": "string"},
                        },
                        "required": ["to", "subject", "body"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "edit_pdf",
                    "description": "Apply simple edits to a PDF: add text annotation on a page and save to output dir.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "input_path": {"type": "string"},
                            "page": {"type": "integer", "minimum": 1},
                            "text": {"type": "string"},
                            "x": {"type": "number", "default": 72},
                            "y": {"type": "number", "default": 72},
                            "output_name": {"type": "string", "nullable": True},
                        },
                        "required": ["input_path", "page", "text"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "generate_pdf_report",
                    "description": "Generate a new PDF report with given title and content, and save to output dir.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "content": {"type": "string"},
                            "output_name": {"type": "string", "nullable": True},
                        },
                        "required": ["title", "content"],
                    },
                },
            },
        ]
        if self._allowed_tools:
            tools = [t for t in tools if t.get("function", {}).get("name") in self._allowed_tools]
        return tools

    def _run_tool(self, name: str, arguments_json: str) -> Dict[str, Any]:
        try:
            args = json.loads(arguments_json or "{}")
        except json.JSONDecodeError:
            args = {}
        if name == "search_context":
            q = args.get("query") or ""
            top_k = int(args.get("top_k") or settings.top_k)
            token_budget = args.get("token_budget")
            filters = {}
            if self._project_id:
                filters["project_id"] = self._project_id
            chunks = self._retriever.retrieve(query=q, top_k=top_k, token_budget=token_budget, filters=filters)
            items = [
                {
                    "source_path": c.get("source_path"),
                    "chunk_id": c.get("chunk_id"),
                    "text": c.get("text"),
                    "metadata": c.get("metadata", {}),
                }
                for c in chunks
            ]
            return {"results": items}
        if name == "send_email":
            to = args.get("to")
            subject = args.get("subject")
            body = args.get("body")
            out = self._send_email_smtp(to, subject, body)
            return {"status": out}
        if name == "edit_pdf":
            inp = args.get("input_path")
            page = int(args.get("page"))
            text = args.get("text")
            x = float(args.get("x", 72))
            y = float(args.get("y", 72))
            output_name = args.get("output_name")
            out_path = self._edit_pdf_add_text(inp, page, text, x, y, output_name)
            return {"output_path": out_path}
        if name == "generate_pdf_report":
            title = args.get("title")
            content = args.get("content")
            output_name = args.get("output_name")
            out_path = self._generate_pdf_report(title, content, output_name)
            return {"output_path": out_path}
        raise ValueError(f"Unknown tool: {name}")

    def _send_email_smtp(self, to: str, subject: str, body: str) -> str:
        host = settings.smtp_host or os.getenv("SMTP_HOST")
        user = settings.smtp_username or os.getenv("SMTP_USERNAME")
        pwd = settings.smtp_password or os.getenv("SMTP_PASSWORD")
        from_addr = settings.email_from_address or os.getenv("EMAIL_FROM") or user
        port = settings.smtp_port
        use_tls = settings.smtp_use_tls
        if not (host and user and pwd and from_addr):
            return "smtp_not_configured"
        msg = EmailMessage()
        msg["From"] = from_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        try:
            with smtplib.SMTP(host, port, timeout=20) as s:
                if use_tls:
                    s.starttls()
                s.login(user, pwd)
                s.send_message(msg)
            return "sent"
        except Exception as e:
            return f"error:{e.__class__.__name__}"

    def _edit_pdf_add_text(self, input_path: str, page: int, text: str, x: float, y: float, output_name: Optional[str]) -> str:
        try:
            import fitz
        except Exception:
            raise RuntimeError("PyMuPDF not installed; install PyMuPDF to use edit_pdf tool")
        in_path = Path(input_path)
        if not in_path.exists():
            raise FileNotFoundError(f"PDF not found: {input_path}")
        out_dir = Path(settings.pdf_output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / (output_name or (in_path.stem + ".edited.pdf"))
        doc = fitz.open(str(in_path))
        try:
            p = doc.load_page(page - 1)
            p.insert_text((x, y), text)
            doc.save(str(out_path))
        finally:
            doc.close()
        return str(out_path)

    def _generate_pdf_report(self, title: str, content: str, output_name: Optional[str] = None) -> str:
        try:
            import fitz
        except Exception:
            raise RuntimeError("PyMuPDF not installed; install PyMuPDF to use generate_pdf_report tool")
        
        out_dir = Path(settings.pdf_output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / (output_name or (title.replace(" ", "_") + ".pdf"))
        doc = fitz.open()
        try:
            page = doc.new_page()
            page.insert_text((72, 72), title, fontsize=18)
            y = 120
            for line in content.split('\n'):
                if y > 700:
                    page = doc.new_page()
                    y = 72
                page.insert_text((72, y), line)
                y += 15
            doc.save(str(out_path))
        finally:
            doc.close()
        
        if self._project_id:
            s3_uri = self._upload_to_s3(str(out_path), self._project_id)
            return s3_uri
        
        return str(out_path)
    
    def _upload_to_s3(self, local_path: str, project_id: str) -> str:
        """Upload a file to S3 and return the S3 URI."""
        try:
            import boto3
            from botocore.exceptions import ClientError
        except ImportError:
            raise RuntimeError("boto3 not installed; install boto3 to use S3 upload")
        
        bucket = settings.s3_bucket or os.getenv("S3_BUCKET")
        if not bucket:
            bucket = f"context-ai-reports-{settings.aws_region}"
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id or os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=settings.aws_secret_access_key or os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=settings.aws_region or os.getenv('AWS_REGION', 'us-east-1')
        )
        
        filename = os.path.basename(local_path)
        s3_key = f"projects/{project_id}/reports/{filename}"
        
        try:
            s3_client.upload_file(local_path, bucket, s3_key)
            s3_uri = f"s3://{bucket}/{s3_key}"
            return s3_uri
        except ClientError as e:
            return f"local:{local_path} (S3 upload failed: {str(e)})"

    async def complete(self, prompt: str, top_k: int = 8, token_budget: Optional[int] = None) -> Dict[str, Any]:
        steps: List[Dict[str, Any]] = []
        if getattr(settings, "agent_planning_enabled", False):
            try:
                from ..api.main import _generate_answer

                plan_prompt = (
                    "You are an autonomous planner. Given the user's request, produce a JSON object:\n"
                    "{\"steps\":[{\"id\":\"s1\",\"action\":\"search_context\",\"args\":{...}},...]}\n"
                    "Allowed actions: search_context, send_email, edit_pdf, generate_pdf_report.\n"
                    "For each step include an optional 'id' string. If a later step needs the output of a prior step,\n"
                    "reference it in the argument by using the placeholder '{{step:<id>}}' (for example '{{step:s1}}').\n"
                    "Return only valid JSON. Don't include extra explanation. The 'args' object should be valid JSON.\n\n"
                    f"User request: {prompt}\n"
                )

                token_budget = token_budget or getattr(settings, "default_token_budget", 6000)
                try:
                    search_res = self._run_tool("search_context", json.dumps({"query": prompt, "top_k": top_k, "token_budget": token_budget}))
                    context_items = search_res.get("results", [])
                    def _truncate(s, n=2000):
                        return s if len(s) <= n else s[:n] + "..."
                    context_text = "\n\n".join([f"Source: {it.get('source_path')}\n{_truncate(it.get('text',''))}" for it in context_items])
                except Exception:
                    context_text = ""

                plan_prompt = plan_prompt + "\n\nContext retrieved by project_id:\n" + (context_text or "(no relevant chunks found)")

                plan_text = await _generate_answer(plan_prompt, "")
                import json as _json

                plan = None
                try:
                    plan = _json.loads(plan_text)
                except Exception:
                    import re

                    m = re.search(r"\{\s*\"steps\"[\s\S]*\}", plan_text)
                    if m:
                        try:
                            plan = _json.loads(m.group(0))
                        except Exception:
                            plan = None

                if plan and isinstance(plan, dict) and isinstance(plan.get("steps"), list):
                    outputs: Dict[str, Any] = {}
                    last_output: Optional[str] = None
                    executed_steps = 0
                    for st in plan.get("steps", [])[: getattr(settings, "agent_plan_max_steps", 12)]:
                        executed_steps += 1
                        sid = st.get("id") or f"step{executed_steps}"
                        action = st.get("action")
                        args = st.get("args") or {}

                        def _sub(v):
                            if isinstance(v, str):
                                import re

                                def _rep(m):
                                    key = m.group(1)
                                    return str(outputs.get(key, ""))

                                return re.sub(r"\{\{step:([^}]+)\}\}", _rep, v)
                            return v

                        def _apply(obj):
                            if isinstance(obj, dict):
                                return {k: _apply(_sub(v)) for k, v in obj.items()}
                            if isinstance(obj, list):
                                return [_apply(_sub(v)) for v in obj]
                            return _sub(obj)

                        args_sub = _apply(args)

                        try:
                            tool_out = self._run_tool(action, json.dumps(args_sub))
                        except Exception as e:
                            tool_out = {"error": str(e)}

                        outputs[sid] = tool_out
                        last_output = json.dumps(tool_out)
                        steps.append({"type": "tool", "id": sid, "name": action, "args": args_sub, "output": tool_out})

                    summary_lines = [f"Step {s.get('id') or ''} ({s.get('name')}): {s.get('output')}" for s in steps if s.get('type') == 'tool']
                    summary = "\n".join(summary_lines)
                    final_prompt = f"Given the following step outputs:\n{summary}\n\nUser request: {prompt}\nProvide a concise final response summarizing results and next actions."
                    final_answer = await _generate_answer(final_prompt, "")
                    steps.append({"type": "final", "content": final_answer})
                    return {"answer": final_answer, "steps": steps}
            except Exception as e:
                steps.append({"type": "error", "content": f"planning_failed: {e}"})

        if settings.llm_backend != "openai" and self._llm_step is None:
            token_budget = token_budget or 1000
            context = self._run_tool(
                "search_context",
                json.dumps({"query": prompt, "top_k": top_k, "token_budget": token_budget}),
            )
            from ..api.main import _generate_answer
            context_text = "\n\n".join([it["text"] for it in context.get("results", [])])
            answer = await _generate_answer(prompt, context_text)
            steps.append({"type": "tool", "name": "search_context", "args": {"query": prompt, "top_k": top_k}, "output_count": len(context.get("results", []))})
            steps.append({"type": "final", "content": answer})
            if "generate_pdf" in prompt.lower() or "generate a pdf" in prompt.lower():
                try:
                    markdown_content = f"# Agent Report\n\n## Summary\n\n{answer}\n\n## Details\n\n- Generated via context search\n- Using HF model"
                    pdf_path = self._generate_pdf_report("Agent Report", markdown_content)
                    answer += f"\n\nPDF generated at: {pdf_path}"
                except Exception as e:
                    answer += f"\n\nFailed to generate PDF: {e}"
            return {"answer": answer, "steps": steps}

        sys_prompt = self._system_prompt or (
            "You are an autonomous assistant. Break the task into small steps. "
            "Use the available tools when helpful. When you have the final answer, reply directly to the user."
        )
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": prompt},
        ]
        tools = self._tool_defs()

        for _ in range(6):
            if self._llm_step is not None:
                result = self._llm_step(messages, tools)
            else:
                import os
                import httpx
                key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
                if not key:
                    raise RuntimeError("OPENAI_API_KEY not configured for agent use")
                headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
                body = {
                    "model": settings.openai_model,
                    "messages": messages,
                    "tools": tools,
                    "tool_choice": "auto",
                    "temperature": 0.2,
                    "max_tokens": settings.max_answer_tokens,
                }
                async with httpx.AsyncClient(timeout=60) as client:
                    r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
                    r.raise_for_status()
                    result = r.json()

            choice = result.get("choices", [{}])[0]
            msg = choice.get("message", {})
            tool_calls = msg.get("tool_calls")
            content = msg.get("content")

            if tool_calls:
                for tc in tool_calls:
                    name = tc.get("function", {}).get("name")
                    arguments = tc.get("function", {}).get("arguments", "{}")
                    call_id = tc.get("id")
                    tool_output = self._run_tool(name, arguments)
                    steps.append({"type": "tool", "name": name, "args": json.loads(arguments or "{}"), "output": tool_output})
                    messages.append({"role": "assistant", "tool_calls": [tc]})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": call_id,
                        "name": name,
                        "content": json.dumps(tool_output),
                    })
                continue

            if content:
                steps.append({"type": "final", "content": content})
                return {"answer": content, "steps": steps}

            break

        context = self._run_tool(
            "search_context",
            json.dumps({"query": prompt, "top_k": top_k, "token_budget": token_budget}),
        )
        context_text = "\n\n".join([it["text"] for it in context.get("results", [])])
        from ..api.main import _generate_answer
        answer = await _generate_answer(prompt, context_text)
        steps.append({"type": "final", "content": answer, "note": "fallback"})
        return {"answer": answer, "steps": steps}

    def _complete_with_langchain(self, prompt: str, top_k: int = 8, token_budget: Optional[int] = None) -> Dict[str, Any]:
        """Synchronous LangChain runner called via thread executor.

        This method is intentionally synchronous because many LangChain LLM wrappers
        are synchronous. It wraps existing `self._run_tool` functions as LangChain
        `Tool` objects and runs an agent to produce an autonomous result.

        LangChain is an optional dependency; if not installed this raises an
        informative error.
        """
        try:
            from langchain.agents import Tool, initialize_agent, AgentType
            try:
                from langchain.chat_models import ChatOpenAI
                llm = ChatOpenAI(temperature=0.2, model=settings.openai_model)
            except Exception:
                from langchain.llms import OpenAI
                llm = OpenAI(temperature=0.2, model=settings.openai_model)
        except Exception as e:
            raise RuntimeError("LangChain not available or failed to import. Install 'langchain' and an LLM backend (e.g. 'openai') to use LangChain mode. Error: " + str(e))

        def _wrap_search(query: str) -> str:
            out = self._run_tool("search_context", json.dumps({"query": query, "top_k": top_k, "token_budget": token_budget}))
            return json.dumps(out)

        def _wrap_send_email(body: str) -> str:
            try:
                payload = json.loads(body)
            except Exception:
                return json.dumps({"status": "invalid_email_payload", "payload": body})
            out = self._run_tool("send_email", json.dumps(payload))
            return json.dumps(out)

        def _wrap_edit_pdf(body: str) -> str:
            try:
                payload = json.loads(body)
            except Exception:
                return json.dumps({"error": "invalid_payload"})
            out = self._run_tool("edit_pdf", json.dumps(payload))
            return json.dumps(out)

        def _wrap_generate_pdf(body: str) -> str:
            try:
                payload = json.loads(body)
            except Exception:
                return json.dumps({"error": "invalid_payload"})
            out = self._run_tool("generate_pdf_report", json.dumps(payload))
            return json.dumps(out)

        tools = [
            Tool(name="search_context", func=_wrap_search, description="Search project context for a query"),
            Tool(name="send_email", func=_wrap_send_email, description="Send an email via configured SMTP"),
            Tool(name="edit_pdf", func=_wrap_edit_pdf, description="Edit a PDF and save output"),
            Tool(name="generate_pdf_report", func=_wrap_generate_pdf, description="Generate a PDF report"),
        ]

        agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=False)

        result = agent.run(prompt)
        return {"answer": result, "steps": [{"type": "langchain", "content": result}]}
