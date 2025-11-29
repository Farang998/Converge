from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional, Tuple
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING
from bson import Binary
import numpy as np
from pymongo.collection import Collection
from ..config import settings


class MongoStore:
    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        self.client = MongoClient(uri or settings.mongo_uri)
        self.db = self.client[db_name or settings.mongo_db]
        self.col_docs: Collection = self.db[settings.mongo_collection_docs]
        self.col_chunks: Collection = self.db[settings.mongo_collection_chunks]
        self.col_agents: Collection = self.db[settings.mongo_collection_agents]
        self.col_conversations: Collection = self.db[settings.mongo_collection_conversations]
        self._ensure_indexes()

    def _ensure_indexes(self):
        self.col_docs.create_index([("source_path", ASCENDING)], unique=True)
        self.col_chunks.create_index([("doc_id", ASCENDING)])
        self.col_chunks.create_index([("metadata.language", ASCENDING)])
        self.col_chunks.create_index([("metadata.file_ext", ASCENDING)])
        self.col_chunks.create_index([("metadata.token_count", ASCENDING)])
        self.col_chunks.create_index([("source_path", ASCENDING)])
        try:
            self.col_chunks.create_index([("project_id", ASCENDING)])
        except Exception:
            pass
        try:
            self.col_chunks.create_index([("text", "text")])
        except Exception:
            pass

        try:
            self.col_agents.create_index([("name", ASCENDING)], unique=True)
        except Exception:
            pass

        try:
            self.col_conversations.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
            self.col_conversations.create_index([("user_id", ASCENDING)])
        except Exception:
            pass

    def upsert_document(self, source_path: str, file_ext: str, language: Optional[str], metadata: Dict[str, Any]) -> str:
        res = self.col_docs.find_one_and_update(
            {"source_path": source_path},
            {"$set": {"file_ext": file_ext, "language": language, "metadata": metadata, "updated_at": datetime.now(timezone.utc)},
             "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True, return_document=True
        )
        if res and "_id" in res:
            return str(res["_id"])  # type: ignore
        doc = self.col_docs.find_one({"source_path": source_path})
        return str(doc["_id"])  # type: ignore

    def insert_chunks(self, doc_id: str, source_path: str, chunks: List[Dict[str, Any]], embeddings: Optional[object] = None) -> List[str]:
        now = datetime.now(timezone.utc)
        rows = []
        for i, ch in enumerate(chunks):
            meta = ch.get("metadata", {})
            token_count = meta.get("token_count")
            language = meta.get("language") or ch.get("language")
            file_ext = meta.get("file_ext") or ch.get("file_ext")

            row = {
                "doc_id": doc_id,
                "source": source_path,
                "source_path": source_path,
                "chunk_id": ch.get("chunk_id", str(i)),
                "text": ch["text"],
                "token_count": token_count,
                "page": meta.get("page") or ch.get("page"),
                "section": (meta.get("headings", [None]) or [None])[0] if meta.get("headings") else ch.get("section"),
                "function_name": ch.get("function_name"),
                "language": "none",  # Set to 'none' for code text indexing
                "file_ext": file_ext,
                "metadata": meta,
                "project_id": meta.get("project_id") if isinstance(meta, dict) else None,
                "created_at": now,
                "updated_at": now,
            }
            if embeddings is not None:
                if isinstance(embeddings, np.ndarray):
                    vec = embeddings[i]
                else:
                    vec = np.array(embeddings[i], dtype=np.float32)
                row["embedding"] = Binary(np.array(vec, dtype=np.float32).tobytes())
            rows.append(row)
        if not rows:
            return []
        res = self.col_chunks.insert_many(rows)
        return [str(_id) for _id in res.inserted_ids]

    def find_chunks(self, filters: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        return list(self.col_chunks.find(filters).limit(limit))

    def all_chunks_for_index(self) -> Iterable[Dict[str, Any]]:
        return self.col_chunks.find({}, projection={"_id": 1, "embedding": 1})

    def get_chunks_by_ids(self, ids: List[Any]) -> List[Dict[str, Any]]:
        from bson import ObjectId
        conv: List[Any] = []
        for i in ids:
            if isinstance(i, str):
                try:
                    conv.append(ObjectId(i))
                except Exception:
                    conv.append(i)
            else:
                conv.append(i)
        return list(self.col_chunks.find({"_id": {"$in": conv}}))

    def save_agent(self, doc: Dict[str, Any]) -> str:
        existing = self.col_agents.find_one({"name": doc.get("name")})
        if existing:
            self.col_agents.update_one({"_id": existing["_id"]}, {"$set": doc})
            return str(existing["_id"])  # type: ignore
        res = self.col_agents.insert_one(doc)
        return str(res.inserted_id)

    def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
        from bson import ObjectId
        try:
            oid = ObjectId(agent_id)
        except Exception:
            return None
        return self.col_agents.find_one({"_id": oid})

    def get_agent_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.col_agents.find_one({"name": name})

    def save_conversation(
        self,
        user_id: str,
        messages: List[Dict[str, Any]],
        query_embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Save a conversation for a user.
        messages should be a list of dicts with 'role' and 'content' keys.
        """
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "messages": messages,
            "created_at": now,
            "updated_at": now,
            "metadata": metadata or {},
        }
        if query_embedding is not None:
            vec = np.array(query_embedding, dtype=np.float32)
            doc["query_embedding"] = Binary(vec.tobytes())
        res = self.col_conversations.insert_one(doc)
        return str(res.inserted_id)

    def get_conversations_by_user(
        self,
        user_id: str,
        limit: int = 10,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get recent conversations for a user, ordered by creation time (newest first)."""
        return list(
            self.col_conversations.find({"user_id": user_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )

    def search_conversations(
        self,
        user_id: str,
        query_embedding: List[float],
        top_k: int = 3,
        min_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant past conversations using vector similarity.
        Returns conversations sorted by relevance (highest first).
        """
        q = np.array(query_embedding, dtype=np.float32)
        results: List[Tuple[Dict[str, Any], float]] = []

        for conv in self.col_conversations.find({"user_id": user_id}):
            emb = conv.get("query_embedding")
            if not emb:
                continue

            if isinstance(emb, (bytes, bytearray)):
                v = np.frombuffer(emb, dtype=np.float32)
            else:
                v = np.array(emb, dtype=np.float32)

            denom = (np.linalg.norm(q) * np.linalg.norm(v) + 1e-8)
            score = float(np.dot(q, v) / denom)

            if score >= min_score:
                results.append((conv, score))

        results.sort(key=lambda x: x[1], reverse=True)
        return [conv for conv, _ in results[:top_k]]
