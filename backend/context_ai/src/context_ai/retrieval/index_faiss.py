from __future__ import annotations
import os
import json
from typing import Dict, List, Tuple
import numpy as np
import faiss

class FaissIndex:
    def __init__(self, dim: int, index_dir: str):
        self.dim = dim
        self.index_dir = index_dir
        os.makedirs(index_dir, exist_ok=True)
        self.index_path = os.path.join(index_dir, "faiss.index")
        self.map_path = os.path.join(index_dir, "id_map.json")
        self.id_map: List[str] = []
        self.index = faiss.IndexFlatIP(dim)
        self._maybe_load()

    def _maybe_load(self):
        if os.path.exists(self.index_path) and os.path.exists(self.map_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.map_path, "r", encoding="utf-8") as f:
                self.id_map = json.load(f)

    def add(self, ids: List[str], embeddings: np.ndarray):
        assert embeddings.shape[1] == self.dim
        faiss.normalize_L2(embeddings)
        self.index.add(embeddings.astype(np.float32))
        self.id_map.extend(ids)
        self._save()

    def search(self, query: np.ndarray, top_k: int) -> List[Tuple[str, float]]:
        if query.ndim == 1:
            query = query.reshape(1, -1)
        faiss.normalize_L2(query)
        D, I = self.index.search(query.astype(np.float32), top_k)
        results: List[Tuple[str, float]] = []
        for score, idx in zip(D[0], I[0]):
            if idx == -1:
                continue
            if idx < len(self.id_map):
                results.append((self.id_map[idx], float(score)))
        return results

    def _save(self):
        faiss.write_index(self.index, self.index_path)
        with open(self.map_path, "w", encoding="utf-8") as f:
            json.dump(self.id_map, f)
