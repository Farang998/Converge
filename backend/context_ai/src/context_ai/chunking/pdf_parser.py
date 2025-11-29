from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional
import fitz
from ..utils.tokenization import approximate_token_count, split_by_token_limit


@dataclass
class PDFChunk:
    text: str
    page: int
    headings: List[str]
    token_count: int


HEADING_RE = re.compile(r"^(?:\d+(?:\.\d+)*\s+)?[A-Z][A-Z\s\-:]{3,}$")


def _extract_pages(path: str) -> List[str]:
    doc = fitz.open(path)
    pages = []
    for pno in range(len(doc)):
        page = doc.load_page(pno)
        text = page.get_text("text")
        pages.append(text)
    return pages


def _detect_headings(lines: List[str]) -> List[int]:
    """Return indices of lines considered headings."""
    indices = []
    for i, line in enumerate(lines):
        s = line.strip()
        if not s:
            continue
        if HEADING_RE.match(s):
            indices.append(i)
            continue
        if s.endswith(":") or (len(s) <= 80 and s.upper() == s and any(c.isalpha() for c in s)):
            indices.append(i)
    return indices


def chunk_pdf(path: str, max_tokens: int = 1500, overlap: int = 200) -> List[Dict]:
    """
    Improved PDF chunking with better context preservation.
    - Larger chunks (1500 tokens) for more context
    - Better overlap (200 tokens) to maintain continuity
    - Includes previous heading context
    - Better paragraph boundary detection
    """
    pages = _extract_pages(path)
    chunks: List[Dict] = []
    chunk_id = 0
    previous_heading = None
    all_headings = []

    for page_idx, page_text in enumerate(pages):
        lines = page_text.splitlines()
        if not lines:
            continue
        
        head_ix = _detect_headings(lines)
        for idx in head_ix:
            heading = lines[idx].strip()
            if heading and heading not in all_headings[-3:]:
                all_headings.append(heading)
        
        boundaries = sorted(set([0] + head_ix + [len(lines)]))
        
        for start, end in zip(boundaries[:-1], boundaries[1:]):
            section_lines = lines[start:end]
            section = "\n".join(section_lines).strip()
            if not section or len(section) < 20:
                continue
            
            current_heading = lines[start].strip() if start in head_ix else None
            context_parts = []
            
            if all_headings:
                recent_headings = all_headings[-3:]
                if recent_headings:
                    context_parts.append("Document context: " + " > ".join(recent_headings))
            
            context_parts.append(f"[Page {page_idx + 1}]")
            
            if current_heading:
                context_parts.append(f"\n{current_heading}\n")
                previous_heading = current_heading
            elif previous_heading:
                context_parts.append(f"(Continues from: {previous_heading})")
            
            if context_parts:
                full_section = "\n".join(context_parts) + "\n\n" + section
            else:
                full_section = section
            
            section_tokens = approximate_token_count(full_section)
            
            if section_tokens <= max_tokens:
                chunks.append({
                    "chunk_id": f"{page_idx}-{chunk_id}",
                    "text": full_section,
                    "page": page_idx + 1,
                    "section": current_heading,
                    "file_ext": "pdf",
                    "metadata": {
                        "page": page_idx + 1,
                        "headings": [current_heading] if current_heading else [],
                        "context_headings": all_headings[-3:],
                        "token_count": section_tokens,
                        "file_ext": "pdf",
                    }
                })
                chunk_id += 1
            else:
                parts = split_by_token_limit(full_section, max_tokens=max_tokens, overlap=overlap)
                for part_idx, part in enumerate(parts):
                    if len(parts) > 1:
                        part_header = f"[Part {part_idx+1}/{len(parts)}]\n\n"
                        part_with_header = part_header + part
                    else:
                        part_with_header = part
                    
                    chunks.append({
                        "chunk_id": f"{page_idx}-{chunk_id}",
                        "text": part_with_header,
                        "page": page_idx + 1,
                        "section": current_heading,
                        "file_ext": "pdf",
                        "metadata": {
                            "page": page_idx + 1,
                            "headings": [current_heading] if current_heading else [],
                            "context_headings": all_headings[-3:],
                            "token_count": approximate_token_count(part_with_header),
                            "file_ext": "pdf",
                            "part_index": part_idx,
                            "total_parts": len(parts),
                        }
                    })
                    chunk_id += 1

    return chunks
