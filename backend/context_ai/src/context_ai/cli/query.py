from __future__ import annotations
import argparse
from ..storage.mongo_store import MongoStore
from ..embeddings.encoder import EmbeddingEncoder
from ..retrieval.search import Retriever


def main():
    parser = argparse.ArgumentParser(description="Query the RAG index")
    parser.add_argument("question")
    parser.add_argument("--top_k", type=int, default=5)
    parser.add_argument("--token_budget", type=int, default=1500)
    parser.add_argument("--project-id", help="Project identifier to restrict search to", default=None)
    parser.add_argument("--mongo-uri", help="MongoDB connection string; overrides env MONGO_URI", default=None)
    parser.add_argument("--mongo-db", help="MongoDB database name; overrides env MONGO_DB", default=None)
    args = parser.parse_args()

    mongo = MongoStore(uri=args.mongo_uri, db_name=args.mongo_db)
    encoder = EmbeddingEncoder()
    retriever = Retriever(mongo, encoder)
    retriever.index_all_from_mongo()

    filters = {}
    if args.project_id:
        filters["project_id"] = args.project_id
    chunks = retriever.retrieve(args.question, top_k=args.top_k, token_budget=args.token_budget, filters=filters)
    context = "\n\n".join([c["text"] for c in chunks])
    print("Context:\n", context)

if __name__ == "__main__":
    main()
