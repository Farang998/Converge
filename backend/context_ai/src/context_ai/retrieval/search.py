from __future__ import annotations
from typing import Dict, List, Tuple, Optional
import logging
import math
from rank_bm25 import BM25Okapi
import numpy as np
from ..config import settings
from ..embeddings.encoder import EmbeddingEncoder
from ..storage.mongo_store import MongoStore
from .index_faiss import FaissIndex
from ..utils.tokenization import approximate_token_count


def _bm25_scores(corpus: List[str], query: str) -> List[float]:
    tokenized_corpus = [doc.split() for doc in corpus]
    if not any(tokenized_corpus):
        return [0.0 for _ in corpus]

    try:
        bm25 = BM25Okapi(tokenized_corpus)
        scores = bm25.get_scores(query.split())
    except Exception:
        return [0.0 for _ in corpus]

    if not getattr(scores, 'size', None):
        return [0.0 for _ in corpus]
    smin, smax = float(np.min(scores)), float(np.max(scores))
    if math.isclose(smax, smin):
        return [0.0 for _ in corpus]
    return [float((s - smin) / (smax - smin)) for s in scores]


class Retriever:
    def __init__(self, mongo: MongoStore, encoder: EmbeddingEncoder, backend: Optional[str] = None):
        self.mongo = mongo
        self.encoder = encoder
        self.backend = backend or settings.vector_backend
        self._faiss: Optional[FaissIndex] = None
        self._dim: Optional[int] = None

    def _ensure_faiss(self):
        if self._faiss is None:
            if self._dim is None:
                emb = self.encoder.encode(["dim"])
                self._dim = emb.shape[1]
            self._faiss = FaissIndex(dim=self._dim, index_dir=settings.index_dir)

    def index_all_from_mongo(self):
        self._ensure_faiss()
        ids: List[str] = []
        vecs: List[List[float]] = []
        for row in self.mongo.all_chunks_for_index():
            emb = row.get("embedding")
            if emb is None:
                continue
            if isinstance(emb, (bytes, bytearray)):
                v = np.frombuffer(emb, dtype=np.float32)
            else:
                v = np.array(emb, dtype=np.float32)
            ids.append(str(row["_id"]))
            vecs.append(v.tolist())
        if vecs:
            self._faiss.add(ids, np.array(vecs, dtype=np.float32))

    def _mongo_vector_search(self, query_vec: List[float], top_k: int, filters: Dict) -> List[Tuple[str, float]]:
        try:
            pipeline = [
                {"$vectorSearch": {
                    "index": "default",
                    "path": "embedding",
                    "queryVector": query_vec,
                    "numCandidates": max(top_k * 50, 200),
                    "limit": top_k
                }},
                {"$project": {"_id": 1, "score": {"$meta": "vectorSearchScore"}}}
            ]
            if filters:
                pipeline.insert(0, {"$match": filters})
            cur = self.mongo.col_chunks.aggregate(pipeline)
            out: List[Tuple[str, float]] = []
            for row in cur:
                out.append((str(row["_id"]), float(row.get("score", 0.0))))
            if out:
                return out[:top_k]
        except Exception:
            pass

        results: List[Tuple[str, float]] = []
        q = np.array(query_vec, dtype=np.float32)
        for row in self.mongo.col_chunks.find(filters, projection={"_id": 1, "embedding": 1, "text": 1}).limit(5000):
            emb = row.get("embedding")
            if not emb:
                continue
            if isinstance(emb, (bytes, bytearray)):
                v = np.frombuffer(emb, dtype=np.float32)
            else:
                v = np.array(emb, dtype=np.float32)
            denom = (np.linalg.norm(q) * np.linalg.norm(v) + 1e-8)
            score = float(np.dot(q, v) / denom)
            results.append((str(row["_id"]), score))
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def retrieve(self, query: str, top_k: int, token_budget: Optional[int], filters: Optional[Dict[str, object]] = None) -> List[Dict]:
        filters = filters or {}
        qvec = self.encoder.encode([query])[0]
        vec_results: List[Tuple[str, float]]
        logger = logging.getLogger("context_ai.retrieval")

        prefer_mongo = False
        if filters and isinstance(filters, dict) and "project_id" in filters:
            prefer_mongo = True

        if (self.backend or settings.vector_backend) == "faiss" and not prefer_mongo:
            self._ensure_faiss()
            vec_results = self._faiss.search(qvec, top_k=top_k) if self._faiss else []
        else:
            vec_results = self._mongo_vector_search(qvec.tolist(), top_k=top_k, filters=filters)

        logger.debug("Vector search returned %d id(s)", len(vec_results))

        ids = [rid for rid, _ in vec_results]
        candidates = self.mongo.get_chunks_by_ids(ids)
        id_to_score = dict(vec_results)

        try:
            logger.debug("Initial candidate ids: %s", ids)
        except Exception:
            pass

        if filters and isinstance(filters, dict) and "project_id" in filters:
            pid = filters.get("project_id")
            if pid is not None:
                candidates = [c for c in candidates if (c.get("project_id") == pid) or (c.get("metadata", {}).get("project_id") == pid)]
                logger.debug("Filtered candidates by project_id=%s, remaining=%d", pid, len(candidates))

        texts = [c["text"] for c in candidates]
        if texts:
            bm25 = _bm25_scores(texts, query)
            alpha = settings.hybrid_alpha
            for i, c in enumerate(candidates):
                vec_s = id_to_score.get(str(c["_id"]), 0.0)
                c["_score"] = alpha * vec_s + (1 - alpha) * bm25[i]
        candidates.sort(key=lambda c: c.get("_score", 0.0), reverse=True)

        try:
            preview = [{"_id": str(c.get("_id")), "project_id": c.get("project_id") or c.get("metadata", {}).get("project_id"), "score": c.get("_score", 0.0), "text_preview": (c.get("text", "")[:120] + "...") if len(c.get("text", "")) > 120 else c.get("text", "")} for c in candidates[:top_k]]
            logger.info("Retriever candidates (top %d): %s", top_k, preview)
        except Exception:
            pass

        if token_budget:
            out: List[Dict] = []
            total = 0
            for c in candidates:
                ctok = c.get("metadata", {}).get("token_count") or approximate_token_count(c.get("text", ""))
                if total + ctok > token_budget:
                    break
                out.append(c)
                total += ctok
            candidates = out

        return candidates[:top_k]
