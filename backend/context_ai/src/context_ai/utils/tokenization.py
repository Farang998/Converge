from __future__ import annotations
import re
from typing import List

try:
    import tiktoken
    _ENC = tiktoken.get_encoding("cl100k_base")
except Exception:
    _ENC = None

_WORD_RE = re.compile(r"\w+|[^\w\s]", re.UNICODE)

def approximate_token_count(text: str) -> int:
    """Approximate token count using tiktoken if available, otherwise fallback.
    The fallback uses a heuristic of ~1.3 tokens per word.
    """
    if _ENC is not None:
        try:
            return len(_ENC.encode(text))
        except Exception:
            pass
    words = _WORD_RE.findall(text)
    return int(len(words) * 1.3)


def split_by_token_limit(text: str, max_tokens: int, overlap: int = 50) -> List[str]:
    """
    Split text into chunks respecting a token budget with intelligent overlap.
    Improved to prefer splitting on sentence/paragraph boundaries when possible.
    """
    if max_tokens <= 0:
        return [text]
    
    if approximate_token_count(text) <= max_tokens:
        return [text]
    
    tokens = []
    if _ENC is not None:
        try:
            tokens = _ENC.encode(text)
        except Exception:
            tokens = []
    
    if not tokens:
        paragraphs = text.split('\n\n')
        if len(paragraphs) > 1:
            chunks = []
            current_chunk = []
            current_tokens = 0
            
            for para in paragraphs:
                para_tokens = approximate_token_count(para)
                
                if current_tokens + para_tokens <= max_tokens:
                    current_chunk.append(para)
                    current_tokens += para_tokens
                else:
                    if current_chunk:
                        chunks.append('\n\n'.join(current_chunk))
                    
                    if para_tokens > max_tokens:
                        sub_chunks = _split_text_by_words(para, max_tokens, overlap)
                        chunks.extend(sub_chunks)
                        current_chunk = []
                        current_tokens = 0
                    else:
                        if chunks and overlap > 0:
                            overlap_text = chunks[-1][-overlap*2:]
                            current_chunk = [overlap_text, para]
                            current_tokens = approximate_token_count(overlap_text) + para_tokens
                        else:
                            current_chunk = [para]
                            current_tokens = para_tokens
            
            if current_chunk:
                chunks.append('\n\n'.join(current_chunk))
            
            return chunks if chunks else [text]
        
        return _split_text_by_words(text, max_tokens, overlap)

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk = _ENC.decode(tokens[start:end])
        chunks.append(chunk)
        step = max(max_tokens - overlap, max_tokens // 2, 1)
        start += step
    return chunks


def _split_text_by_words(text: str, max_tokens: int, overlap: int) -> List[str]:
    """Helper to split text by words when tiktoken unavailable."""
    words = text.split()
    chunks = []
    start = 0
    approx_ratio = 1.3
    max_words = max(int(max_tokens / approx_ratio), 1)
    ovlp_words = max(int(overlap / approx_ratio), 0)
    
    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]))
        step = max(max_words - ovlp_words, 1)
        start += step
    
    return chunks
