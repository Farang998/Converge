"""
Clear MongoDB collections and re-ingest the context_ai project.
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from context_ai.storage.mongo_store import MongoStore
from context_ai.embeddings.encoder import EmbeddingEncoder
from context_ai.chunking.code_parser import chunk_code
from context_ai.utils.tokenization import approximate_token_count

def clear_mongodb():
    """Clear all documents and chunks from MongoDB."""
    print("Connecting to MongoDB...")
    mongo = MongoStore()
    
    print("Clearing chunks collection...")
    result = mongo.col_chunks.delete_many({})
    print(f"  Deleted {result.deleted_count} chunks")
    
    print("Clearing documents collection...")
    result = mongo.col_docs.delete_many({})
    print(f"  Deleted {result.deleted_count} documents")
    
    print("MongoDB cleared successfully!")
    return mongo

def ingest_project(mongo, project_id="context_ai_project"):
    """Ingest all Python files from the src/context_ai directory."""
    print(f"\nIngesting project with project_id: {project_id}")
    
    encoder = EmbeddingEncoder()
    src_dir = Path(__file__).parent / "src" / "context_ai"
    
    if not src_dir.exists():
        print(f"Error: {src_dir} does not exist")
        return
    
    py_files = list(src_dir.rglob("*.py"))
    print(f"Found {len(py_files)} Python files")
    
    total_chunks = 0
    for idx, py_file in enumerate(py_files, 1):
        print(f"\n[{idx}/{len(py_files)}] Processing: {py_file.relative_to(src_dir.parent)}")
        
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                text = f.read()
            
            chunks = chunk_code(str(py_file), text)
            
            if not chunks:
                print("  No chunks generated, skipping")
                continue
            
            for chunk in chunks:
                meta = chunk.setdefault("metadata", {})
                meta["project_id"] = project_id
            
            doc_id = mongo.upsert_document(
                source_path=str(py_file),
                file_ext="py",
                language="python",
                metadata={"project_id": project_id}
            )
            
            texts = [c["text"] for c in chunks]
            embeddings = encoder.encode(texts)
            
            chunk_ids = mongo.insert_chunks(
                doc_id=doc_id,
                source_path=str(py_file),
                chunks=chunks,
                embeddings=embeddings
            )
            
            print(f"  Created {len(chunk_ids)} chunks")
            total_chunks += len(chunk_ids)
            
            token_counts = [c.get("metadata", {}).get("token_count", 0) for c in chunks]
            if token_counts:
                avg_tokens = sum(token_counts) / len(token_counts)
                print(f"  Avg chunk size: {avg_tokens:.0f} tokens")
            
        except Exception as e:
            print(f"  Error processing {py_file}: {e}")
            continue
    
    print(f"\n{'='*60}")
    print(f"Ingestion complete!")
    print(f"Total files processed: {len(py_files)}")
    print(f"Total chunks created: {total_chunks}")
    print(f"Project ID: {project_id}")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("="*60)
    print("CLEAR AND RE-INGEST SCRIPT")
    print("="*60)
    
    mongo = clear_mongodb()
    
    ingest_project(mongo, project_id="context_ai_project")
    
    print("\n✅ Done! You can now test queries.")
    
    print("\n6. Triggering API to rebuild FAISS index...")
    try:
        import requests
        response = requests.get("http://localhost:5000/health")
        if response.status_code == 200:
            print("   ✅ API FAISS index rebuilt")
        else:
            print(f"   ⚠️  API returned status {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Could not reach API: {e}")
        print("   Make sure API is running: uvicorn src.context_ai.api.main:app --host 0.0.0.0 --port 5000 --reload")
    
    print("\nExample query:")
    print("""
curl -X POST http://localhost:5000/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "context_ai_project",
    "query": "Explain the architecture and main components of the system",
    "top_k": 6
  }'
    """)
