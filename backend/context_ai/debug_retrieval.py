"""
Debug script to check retrieval and chunking.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from context_ai.storage.mongo_store import MongoStore
from context_ai.embeddings.encoder import EmbeddingEncoder
from context_ai.retrieval.search import Retriever

def debug_retrieval():
    print("="*60)
    print("DEBUGGING RETRIEVAL")
    print("="*60)
    
    mongo = MongoStore()
    encoder = EmbeddingEncoder()
    retriever = Retriever(mongo, encoder)
    
    print("\n1. Checking MongoDB chunks...")
    chunks = list(mongo.col_chunks.find({"project_id": "context_ai_project"}).limit(5))
    print(f"   Found {len(chunks)} sample chunks")
    if chunks:
        print(f"   Sample chunk: {chunks[0].get('source_path', 'N/A')}")
        print(f"   Has embedding: {chunks[0].get('embedding') is not None}")
        print(f"   Text preview: {chunks[0].get('text', '')[:100]}...")
    
    total = mongo.col_chunks.count_documents({"project_id": "context_ai_project"})
    print(f"\n   Total chunks in DB: {total}")
    
    print("\n2. Building FAISS index...")
    retriever.index_all_from_mongo()
    print("   FAISS index built")
    
    print("\n3. Testing retrieval...")
    query = "How does the Retriever class work?"
    filters = {"project_id": "context_ai_project"}
    
    results = retriever.retrieve(
        query=query,
        top_k=6,
        token_budget=6000,
        filters=filters
    )
    
    print(f"   Query: {query}")
    print(f"   Retrieved {len(results)} chunks")
    
    if results:
        print("\n4. Sample retrieved chunks:")
        for i, chunk in enumerate(results[:3], 1):
            print(f"\n   Chunk {i}:")
            print(f"   - Source: {chunk.get('source_path', 'N/A')}")
            print(f"   - Tokens: {chunk.get('metadata', {}).get('token_count', 0)}")
            print(f"   - Text preview: {chunk.get('text', '')[:150]}...")
    else:
        print("\n   ⚠️  NO CHUNKS RETRIEVED!")
        print("   This explains why the API returns no context.")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    debug_retrieval()
