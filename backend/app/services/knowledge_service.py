import logging
import httpx
import json
from typing import List, Dict, Any, Optional
from app.config.settings import settings
from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)

class KnowledgeService:
    """Service for RAG (Retrieval Augmented Generation) operations"""
    
    def __init__(self):
        self.api_key = settings.NVIDIA_NIM_API_KEY
        self.base_url = settings.NVIDIA_NIM_BASE_URL
        # Using a standard NVIDIA embedding model
        self.embedding_model = "nvidia/nv-embedqa-e5-v5" 
        
    async def get_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using NVIDIA NIM"""
        if not self.api_key:
            logger.error("NVIDIA_NIM_API_KEY not set")
            return []

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": [text],
            "model": self.embedding_model,
            "input_type": "query",
            "encoding_format": "float"
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Note: Some NIM deployments use /embeddings endpoint
                response = await client.post(
                    f"{self.base_url}/embeddings",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
            except Exception as e:
                logger.error(f"Embedding generation failed: {e}")
                return []

    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search knowledge base using vector similarity"""
        embedding = await self.get_embedding(query)
        
        if not embedding:
            return [{"error": "Knowledge retrieval failed: Embedding could not be generated."}]
            
        try:
            # Query the match_documents RPC in Supabase
            result = supabase_client.rpc('match_documents', {
                'query_embedding': embedding,
                'match_threshold': 0.35,
                'match_count': limit
            }).execute()
            
            if not result.data:
                return [{"note": "No relevant business rules or policies found for this query."}]
                
            return result.data
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return [{"error": f"Search failed: {str(e)}. Ensure 'match_documents' RPC and 'pgvector' are enabled."}]

# Global instance
knowledge_service = KnowledgeService()
