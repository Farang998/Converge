from pathlib import Path
from context_ai.config import settings

def generate_pdf_report(title: str, content: str, output_name: str = None):
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
    return str(out_path)

if __name__ == "__main__":
    title = "Context AI Project Class Diagram and Structure Report"
    content = """
Project Overview:
The context_ai project is an AI-powered context retrieval system built with Python. It uses MongoDB for storage, FAISS for vector indexing, and supports embeddings via SentenceTransformers.

Main Modules and Classes:

1. Agent (agent/orchestrator.py):
   - AgentOrchestrator: Manages agent loops with tools like search_context, send_email, edit_pdf, generate_pdf_report.
   - Supports OpenAI tool-calling or local LLM fallback.

2. Storage (storage/mongo_store.py):
   - MongoStore: Handles MongoDB operations for documents, chunks, and agents.
   - Methods: upsert_document, insert_chunks, find_chunks, save_agent, etc.

3. Retrieval (retrieval/search.py):
   - Retriever: Combines vector search (FAISS) and BM25 for hybrid retrieval.
   - Uses EmbeddingEncoder for text embeddings.

4. Embeddings (embeddings/encoder.py):
   - EmbeddingEncoder: Wraps SentenceTransformer for encoding texts.

5. Chunking (chunking/):
   - code_parser.py, pdf_parser.py: Parse code and PDF files into chunks.

6. API (api/main.py):
   - FastAPI app for querying the system.

7. CLI (cli/):
   - ingest.py, query.py: Command-line tools for ingestion and querying.

8. Utils (utils/tokenization.py):
   - Tokenization utilities.

Class Relationships:
- AgentOrchestrator uses Retriever for search_context tool.
- Retriever uses MongoStore and EmbeddingEncoder.
- MongoStore connects to MongoDB collections.
- CLI and API use the core components.

This structure enables efficient context retrieval for AI applications.
"""
    pdf_path = generate_pdf_report(title, content)
    print(f"PDF report generated at: {pdf_path}")