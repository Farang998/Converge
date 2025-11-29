from __future__ import annotations
import ast
import re
from typing import Dict, List, Optional
from ..utils.tokenization import approximate_token_count, split_by_token_limit


PY_FUNC_RE = re.compile(r"^(def|class)\s+\w+\s*\(?.*", re.MULTILINE)
JS_FUNC_RE = re.compile(r"^(function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|export\s+function\s+\w+\s*\(|class\s+\w+)", re.MULTILINE)


def _detect_language(path: str) -> str:
    if path.endswith('.py'):
        return 'python'
    if path.endswith('.js'):
        return 'javascript'
    if path.endswith('.ts'):
        return 'typescript'
    if path.endswith('.md'):
        return 'markdown'
    return 'text'


def chunk_python_code(text: str) -> List[Dict]:
    chunks: List[Dict] = []
    try:
        tree = ast.parse(text)
    except SyntaxError:
        return chunk_code_by_regex(text, lang='python')

    lines = text.splitlines()

    imports = []
    module_docstring = ""
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            start = node.lineno - 1
            end = getattr(node, 'end_lineno', start)
            imports.append("\n".join(lines[start:end]))
        elif isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant):
            if isinstance(node.value.value, str):
                module_docstring = node.value.value
                break

    imports_text = "\n".join(imports)
    
    def get_src_with_context(node: ast.AST, include_docstring: bool = True) -> str:
        if not hasattr(node, 'lineno'):
            return ''
        start = node.lineno - 1
        end = getattr(node, 'end_lineno', start)
        
        src = "\n".join(lines[start:end])
        
        context_parts = []
        if imports_text:
            context_parts.append("# File imports:\n" + imports_text)
        
        if module_docstring and include_docstring:
            context_parts.append('"""' + module_docstring[:200] + '..."""' if len(module_docstring) > 200 else '"""' + module_docstring + '"""')
        
        context_before = []
        for i in range(max(0, start - 3), start):
            line = lines[i].strip()
            if line and not line.startswith('#'):
                context_before.append(lines[i])
        
        if context_parts or context_before:
            full_context = "\n".join(context_parts)
            if context_before:
                full_context += "\n# ... preceding context ...\n" + "\n".join(context_before)
            full_context += "\n\n" + src
            return full_context
        
        return src

    chunk_id = 0
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            src = get_src_with_context(node)
            if src.strip():
                name = getattr(node, 'name', '')
                
                if isinstance(node, ast.ClassDef):
                    methods = [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
                    if methods:
                        src = f"# Class methods: {', '.join(methods[:10])}\n\n" + src
                
                chunks.append({
                    "chunk_id": f"{chunk_id}",
                    "text": src,
                    "metadata": {
                        "language": "python",
                        "symbol": name,
                        "kind": node.__class__.__name__,
                        "token_count": approximate_token_count(src),
                        "file_ext": "py",
                    }
                })
                chunk_id += 1
    
    if not chunks:
        chunks.append({
            "chunk_id": "0",
            "text": text,
            "metadata": {
                "language": "python",
                "token_count": approximate_token_count(text),
                "file_ext": "py",
            }
        })
    return chunks


def chunk_code_by_regex(text: str, lang: str) -> List[Dict]:
    pattern = PY_FUNC_RE if lang == 'python' else JS_FUNC_RE
    lines = text.splitlines()
    indices = [i for i, line in enumerate(lines) if pattern.match(line.strip())]
    if not indices:
        return [{
            "chunk_id": "0",
            "text": text,
            "metadata": {"language": lang, "token_count": approximate_token_count(text)}
        }]
    
    imports = []
    for i, line in enumerate(lines[:30]):
        stripped = line.strip()
        if (stripped.startswith('import ') or stripped.startswith('from ') or 
            stripped.startswith('require(') or stripped.startswith('const ') and 'require' in stripped):
            imports.append(line)
    
    imports_text = "\n".join(imports) if imports else ""
    
    indices.append(len(lines))
    chunks: List[Dict] = []
    for cid, (s, e) in enumerate(zip(indices[:-1], indices[1:])):
        context_start = max(0, s - 3)
        context_lines = []
        
        if s < 50 and imports_text:
            context_lines.append("// File imports/requires:")
            context_lines.append(imports_text)
            context_lines.append("")
        
        for i in range(context_start, s):
            line = lines[i].strip()
            if line and not line.startswith(('import ', 'from ', '//', '#')):
                context_lines.append(lines[i])
        
        seg = "\n".join(lines[s:e]).strip()
        
        if context_lines:
            full_text = "\n".join(context_lines) + "\n\n" + seg
        else:
            full_text = seg
        
        if full_text.strip():
            chunks.append({
                "chunk_id": str(cid),
                "text": full_text,
                "metadata": {"language": lang, "token_count": approximate_token_count(full_text)}
            })
    return chunks


def chunk_code(path: str, text: str, max_tokens: int = 1500, overlap: int = 200) -> List[Dict]:
    """
    Improved chunking with better context preservation.
    Increased defaults: max_tokens=1500, overlap=200 for better context.
    """
    lang = _detect_language(path)
    if lang == 'python':
        chunks = chunk_python_code(text)
    else:
        chunks = chunk_code_by_regex(text, 'javascript' if lang in ['javascript', 'typescript'] else lang)

    out: List[Dict] = []
    cid = 0
    for ch in chunks:
        t = ch["text"]
        if approximate_token_count(t) <= max_tokens:
            ch["chunk_id"] = str(cid)
            meta = ch.get("metadata", {})
            kind = meta.get("kind")
            symbol = meta.get("symbol")
            if kind in ("FunctionDef", "AsyncFunctionDef"):
                ch["function_name"] = symbol
                ch["section"] = "function"
            elif kind == "ClassDef":
                ch["function_name"] = None
                ch["section"] = "class"
            ch["file_ext"] = meta.get("file_ext")
            ch["language"] = meta.get("language") or lang
            out.append(ch)
            cid += 1
        else:
            parts = split_by_token_limit(t, max_tokens=max_tokens, overlap=overlap)
            for idx, part in enumerate(parts):
                meta = ch.get("metadata", {})
                kind = meta.get("kind")
                symbol = meta.get("symbol")
                section = "function" if kind in ("FunctionDef", "AsyncFunctionDef") else ("class" if kind == "ClassDef" else None)
                
                part_text = part
                if len(parts) > 1:
                    part_text = f"# Part {idx+1}/{len(parts)} of {symbol or 'chunk'}\n\n{part}"
                
                out.append({
                    "chunk_id": str(cid),
                    "text": part_text,
                    "function_name": symbol if section == "function" else None,
                    "section": section,
                    "file_ext": meta.get("file_ext"),
                    "language": meta.get("language") or lang,
                    "metadata": {**meta, "token_count": approximate_token_count(part_text), "part_index": idx}
                })
                cid += 1
    return out
