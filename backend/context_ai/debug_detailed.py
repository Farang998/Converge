"""
More detailed debug to find the filtering issue.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from context_ai.storage.mongo_store import MongoStore
from context_ai.embeddings.encoder import EmbeddingEncoder
from context_ai.retrieval.search import Retriever

def detailed_debug():
    print("="*60)
    print("DETAILED RETRIEVAL DEBUG")
    print("="*60)
    
    mongo = MongoStore()
    encoder = EmbeddingEncoder()
    retriever = Retriever(mongo, encoder)
    
    print("\n1. Building FAISS index...")
    retriever.index_all_from_mongo()
    
    query = "How does the Retriever class work?"
    qvec = encoder.encode([query])[0]
    
    print(f"\n2. FAISS search for: '{query}'")
    vec_results = retriever._faiss.search(qvec, top_k=10)
    print(f"   FAISS returned {len(vec_results)} results")
    
    if vec_results:
        print("\n3. Fetching chunks from MongoDB...")
        ids = [rid for rid, _ in vec_results]
        print(f"   IDs to fetch: {ids[:3]}...")
        
        candidates = mongo.get_chunks_by_ids(ids)
        print(f"   Fetched {len(candidates)} candidates from MongoDB")
        
        if candidates:
            print("\n4. Checking project_id in candidates...")
            for i, c in enumerate(candidates[:3], 1):
                pid_top = c.get("project_id")
                pid_meta = c.get("metadata", {}).get("project_id")
                print(f"\n   Candidate {i}:")
                print(f"   - _id: {c.get('_id')}")
                print(f"   - source: {c.get('source_path', 'N/A')[-50:]}")
                print(f"   - project_id (top-level): {pid_top}")
                print(f"   - project_id (metadata): {pid_meta}")
            
            print("\n5. Testing project_id filter...")
            filters = {"project_id": "context_ai_project"}
            pid = filters.get("project_id")
            
            filtered = [c for c in candidates if (c.get("project_id") == pid) or (c.get("metadata", {}).get("project_id") == pid)]
            print(f"   Before filter: {len(candidates)} candidates")
            print(f"   After filter: {len(filtered)} candidates")
            
            if len(filtered) == 0:
                print("\n   ⚠️  ALL CANDIDATES FILTERED OUT!")
                print("   Checking why...")
                if candidates:
                    c = candidates[0]
                    print(f"   Sample candidate project_id: {repr(c.get('project_id'))}")
                    print(f"   Sample candidate metadata.project_id: {repr(c.get('metadata', {}).get('project_id'))}")
                    print(f"   Filter looking for: {repr(pid)}")
        else:
            print("\n   ⚠️  MongoDB returned no candidates!")
    else:
        print("\n   ⚠️  FAISS returned no results!")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    detailed_debug()
