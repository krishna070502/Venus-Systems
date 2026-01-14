from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class KnowledgeChunk(BaseModel):
    id: Optional[int] = None
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None

class KnowledgeSearchRequest(BaseModel):
    query: str
    limit: int = 5
    threshold: float = 0.5
