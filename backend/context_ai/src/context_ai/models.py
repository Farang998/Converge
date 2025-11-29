from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class IngestRequest(BaseModel):
    directory: Optional[str] = None
    files: Optional[List[str]] = None
    s3_uris: Optional[List[str]] = None
    recursive: bool = True
    patterns: List[str] = Field(default_factory=lambda: ["**/*.pdf", "**/*.py", "**/*.js", "**/*.ts", "**/*.md"])  # md optional
    project_id: Optional[str] = None

class QueryFilters(BaseModel):
    path_contains: Optional[str] = None
    language: Optional[str] = None
    file_ext: Optional[str] = None
    min_tokens: Optional[int] = None
    max_tokens: Optional[int] = None

class QueryRequest(BaseModel):
    query: str
    top_k: int = 8
    token_budget: Optional[int] = None
    backend: Optional[str] = None
    filters: Optional[QueryFilters] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None

class DocumentRecord(BaseModel):
    _id: Optional[str] = None
    source_path: str
    file_ext: str
    language: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ChunkRecord(BaseModel):
    _id: Optional[str] = None
    doc_id: Optional[str] = None
    source_path: str
    chunk_id: str
    text: str
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class QueryResponse(BaseModel):
    answer: str
    context: List[ChunkRecord]
    used_backend: str
    tokens_used: int


class AgentRequest(BaseModel):
    prompt: str
    top_k: int = 8
    token_budget: Optional[int] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None


class AgentResponse(BaseModel):
    answer: str
    steps: List[Dict[str, Any]] = Field(default_factory=list)


class AgentConfig(BaseModel):
    _id: Optional[str] = None
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: List[str] = Field(default_factory=lambda: ["search_context"])  # allowed tool names
    project_id: Optional[str] = None


class CreateAgentRequest(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[str]] = None
    project_id: Optional[str] = None


class CreateAgentResponse(BaseModel):
    agent_id: str


class RunAgentRequest(BaseModel):
    prompt: str
    top_k: int = 8
    token_budget: Optional[int] = None
    user_id: Optional[str] = None


class GenerateReportRequest(BaseModel):
    project_id: str
    title: Optional[str] = None
    output_name: Optional[str] = None
