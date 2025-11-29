from __future__ import annotations
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer
from ..config import settings


class EmbeddingEncoder:
    def __init__(self, model_name: str | None = None, device: str | None = None):
        name = model_name or settings.embedding_model_name
        self.model = SentenceTransformer(name, device=device)

    def encode(self, texts: List[str], batch_size: int | None = None, normalize: bool = True) -> np.ndarray:
        bs = batch_size or settings.embedding_batch_size
        embs = self.model.encode(texts, batch_size=bs, convert_to_numpy=True, normalize_embeddings=normalize, show_progress_bar=False)
        return embs
