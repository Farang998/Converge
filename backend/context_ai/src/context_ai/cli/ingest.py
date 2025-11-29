from __future__ import annotations
import argparse
import os
from glob import glob
from pathlib import Path
from ..storage.mongo_store import MongoStore
from ..embeddings.encoder import EmbeddingEncoder
from ..chunking.pdf_parser import chunk_pdf
from ..chunking.code_parser import chunk_code
from ..utils.tokenization import approximate_token_count
from ..config import settings


def main():
    parser = argparse.ArgumentParser(description="Ingest documents into MongoDB and FAISS")
    parser.add_argument("path", help="File or directory to ingest")
    parser.add_argument("--project-id", help="Project identifier to associate with ingested chunks", default=None)
    parser.add_argument("--recursive", action="store_true")
    parser.add_argument("--mongo-uri", help="MongoDB connection string; overrides env MONGO_URI", default=None)
    parser.add_argument("--mongo-db", help="MongoDB database name; overrides env MONGO_DB", default=None)
    args = parser.parse_args()

    mongo = MongoStore(uri=args.mongo_uri, db_name=args.mongo_db)
    encoder = EmbeddingEncoder()

    files = []
    if os.path.isdir(args.path):
        for pat in ["**/*.pdf", "**/*.py", "**/*.js", "**/*.ts", "**/*.md"]:
            files.extend(glob(os.path.join(args.path, pat), recursive=args.recursive))
    else:
        files = [args.path]

    for path in files:
        ext = Path(path).suffix.lower().lstrip('.')
        if ext == 'pdf':
            chunks = chunk_pdf(path)
        else:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            if ext in ("py", "js", "ts", "md"):
                chunks = chunk_code(path, text)
            else:
                chunks = [{"chunk_id": "0", "text": text, "metadata": {"token_count": approximate_token_count(text), "file_ext": ext}}]
        for c in chunks:
            meta = c.setdefault("metadata", {})
            if args.project_id:
                meta["project_id"] = args.project_id

        doc_id = mongo.upsert_document(source_path=path, file_ext=ext, language=None, metadata={"project_id": args.project_id} if args.project_id else {})
        embeddings = encoder.encode([c["text"] for c in chunks]).tolist()
        mongo.insert_chunks(doc_id=doc_id, source_path=path, chunks=chunks, embeddings=embeddings)

    print(f"Ingested {len(files)} files")

if __name__ == "__main__":
    main()
