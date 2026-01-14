import os
import asyncio
import logging
from typing import List
from app.services.knowledge_service import knowledge_service
from app.services.supabase_client import supabase_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def ingest_file(file_path: str):
    """Read a file, chunk it, and store in Supabase with embeddings"""
    if not os.path.exists(file_path):
        return

    logger.info(f"Ingesting: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        logger.error(f"Could not read {file_path}: {e}")
        return

    # Logical chunking (by section or size)
    chunks = [c.strip() for c in content.split('\n## ') if len(c.strip()) > 20]
    if len(chunks) <= 1:
        chunks = [c.strip() for c in content.split('\n\n') if len(c.strip()) > 50]

    for i, chunk in enumerate(chunks):
        # Prefix chunk with its header if it was split by headers
        if not chunk.startswith('#') and i > 0:
            chunk = "## " + chunk

        embedding = await knowledge_service.get_embedding(chunk[:4000]) # Cap for safety
        
        if embedding:
            data = {
                "content": chunk,
                "metadata": {
                    "source": os.path.relpath(file_path, ".."),
                    "chunk_index": i,
                    "ingested_at": "now()"
                },
                "embedding": embedding
            }
            supabase_client.table('knowledge_base').insert(data).execute()
        else:
            logger.error(f"Failed to generate embedding for chunk {i} in {file_path}")

async def main():
    # 1. Clear existing knowledge for a clean sync
    logger.info("Clearing existing knowledge base for full sync...")
    supabase_client.table('knowledge_base').delete().neq('id', 0).execute()

    # 2. Define high-value paths to ingest
    paths_to_scan = [
        "../../Documentation",
        "../../README.md",
        "../../AI_AGENT_GUIDELINES.md",
        "../../COMPLETE_PROJECT_DOCUMENTATION.md",
        "../../frontend/INSTALL_NOTE.md",
        # Brain Artifacts (High Context)
        "/Users/gopalsmac/.gemini/antigravity/brain/3ce5e999-41ec-4048-ae95-c2abf2c016b5/walkthrough.md",
        "/Users/gopalsmac/.gemini/antigravity/brain/3ce5e999-41ec-4048-ae95-c2abf2c016b5/implementation_plan.md"
    ]

    for path in paths_to_scan:
        # Check if it's an absolute path (like the brain artifacts) or relative
        if path.startswith("/"):
            abs_path = path
        else:
            abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), path))
        
        logger.info(f"Checking path: {abs_path}")
        if os.path.isdir(abs_path):
            for root, dirs, files in os.walk(abs_path):
                for file in files:
                    if file.endswith((".md", ".txt")):
                        await ingest_file(os.path.join(root, file))
        elif os.path.isfile(abs_path):
            await ingest_file(abs_path)
        else:
            logger.warning(f"Path not found: {abs_path}")

    logger.info("Full sync complete!")

if __name__ == "__main__":
    asyncio.run(main())
