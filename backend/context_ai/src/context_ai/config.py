from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional, Literal
import os
from dotenv import load_dotenv



load_dotenv()

class Settings(BaseSettings):
    mongo_uri: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    mongo_db: str = Field(default="context_ai")
    mongo_collection_docs: str = Field(default="documents")
    mongo_collection_chunks: str = Field(default="chunks")
    mongo_collection_agents: str = Field(default="agents")
    mongo_collection_conversations: str = Field(default="conversations")

    embedding_model_name: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    embedding_batch_size: int = Field(default=64)

    vector_backend: Literal["faiss", "mongo"] = Field(default="faiss")
    index_dir: str = Field(default="index")
    top_k: int = Field(default=6, description="Number of chunks to retrieve (reduced for larger chunks)")
    hybrid_alpha: float = Field(default=0.7, description="Weight for vector score in hybrid [0-1]")
    mmr_lambda: float = Field(default=0.5)
    default_token_budget: int = Field(default=6000, description="Default token budget for query context")
    
    conversation_memory_enabled: bool = Field(default=True)
    conversation_retrieval_top_k: int = Field(default=3, description="Number of past conversations to retrieve")
    conversation_max_history_tokens: int = Field(default=2000, description="Max tokens for conversation history context")

    llm_backend: Literal["openai", "hf-local", "gemini"] = Field(default="hf-local")
    openai_api_key: Optional[str] = None
    openai_model: str = Field(default="gpt-4o-mini")
    gemini_api_key: Optional[str] = None
    gemini_model: str = Field(default="gemini-2.0-flash")
    hf_model_name: str = Field(default="google/flan-t5-base")
    max_context_tokens: int = Field(default=100000)
    max_answer_tokens: int = Field(default=2048)

    smtp_host: Optional[str] = None
    smtp_port: int = Field(default=587)
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = Field(default=True)
    email_from_address: Optional[str] = None

    pdf_output_dir: str = Field(default="./output")

    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = Field(default="us-east-1")
    aws_storage_bucket_name: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_ingest_enabled: bool = Field(default=False)
    s3_temp_dir: str = Field(default="temp_s3_downloads")

    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)
    use_langchain: bool = Field(default=False)
    agent_planning_enabled: bool = Field(default=True)
    agent_plan_max_steps: int = Field(default=12)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

settings = Settings()