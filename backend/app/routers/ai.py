"""
AI Router
=========
API endpoints for AI assistant with conversation management.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

from app.dependencies.auth import get_current_user
from app.dependencies.rbac import require_permission
from app.services.ai_service import ai_service
from app.services.role_service import RoleService
from app.utils.field_filter import filter_fields, filter_fields_list

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    current_page: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    tool_calls: Optional[List[Dict]] = None
    error: Optional[str] = None


class ConversationCreate(BaseModel):
    title: str = "New Conversation"


class AIConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    allowed_tables: Optional[List[str]] = None
    allowed_pages: Optional[List[str]] = None
    can_execute_actions: Optional[bool] = None
    max_queries_per_hour: Optional[int] = None


# Field-level permission config
AI_CONFIG_FIELD_CONFIG = {
    "role_name": "ai.field.tables",
    "allowed_tables": "ai.field.tables",
    "allowed_pages": "ai.field.pages",
    "can_execute_actions": "ai.field.actions",
    "max_queries_per_hour": "ai.field.querylimit",
}

ALWAYS_INCLUDE = {"id", "role_id", "enabled"}


# =============================================================================
# CHAT ENDPOINTS
# =============================================================================

@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(require_permission(["ai.chat"]))]
)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to the AI assistant.
    
    If no conversation_id is provided, a new conversation will be created.
    The AI can query the database based on your role's allowed tables.
    """
    user_id = current_user["id"]
    
    # Create conversation if needed
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation = await ai_service.create_conversation(user_id)
        conversation_id = conversation.get("id")
        
        if not conversation_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create conversation"
            )
    
    # Send message to AI
    result = await ai_service.chat(user_id, conversation_id, request.message, request.current_page)
    
    if "error" in result:
        return ChatResponse(
            conversation_id=conversation_id,
            response="",
            error=result["error"]
        )
    
    return ChatResponse(
        conversation_id=conversation_id,
        response=result.get("response", ""),
        tool_calls=result.get("tool_calls")
    )


@router.get(
    "/status"
)
async def get_ai_status(current_user: dict = Depends(get_current_user)):
    """Check if AI is available and enabled for the current user"""
    user_id = current_user["id"]
    
    has_permission = await ai_service.check_ai_permission(user_id)
    config = await ai_service.get_user_ai_config(user_id) if has_permission else None
    
    return {
        "available": ai_service.nim_client.is_available,
        "enabled": bool(config),
        "has_permission": has_permission,
        "allowed_tables": config.get("allowed_tables", []) if config else [],
        "can_execute_actions": config.get("can_execute_actions", False) if config else False
    }


# =============================================================================
# CONVERSATION ENDPOINTS
# =============================================================================

@router.get(
    "/conversations",
    dependencies=[Depends(require_permission(["ai.conversations.read"]))]
)
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get user's conversation history"""
    conversations = await ai_service.get_conversations(current_user["id"])
    return conversations


@router.post(
    "/conversations",
    dependencies=[Depends(require_permission(["ai.chat"]))]
)
async def create_conversation(
    request: ConversationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new conversation"""
    conversation = await ai_service.create_conversation(current_user["id"], request.title)
    return conversation


@router.get(
    "/conversations/{conversation_id}",
    dependencies=[Depends(require_permission(["ai.conversations.read"]))]
)
async def get_conversation_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a conversation"""
    messages = await ai_service.get_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}


@router.delete(
    "/conversations/{conversation_id}",
    dependencies=[Depends(require_permission(["ai.conversations.delete"]))]
)
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a conversation"""
    success = await ai_service.delete_conversation(current_user["id"], conversation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied"
        )
    
    return {"message": "Conversation deleted"}


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get(
    "/configs",
    dependencies=[Depends(require_permission(["ai.admin"]))]
)
async def get_ai_configs(current_user: dict = Depends(get_current_user)):
    """Get AI configurations for all roles"""
    from app.services.supabase_client import supabase_client
    
    role_service = RoleService()
    
    # Get configs
    response = supabase_client.table('ai_agent_configs').select('*').order('role_id').execute()
    configs = response.data if response.data else []
    
    # Enrich with role names
    for config in configs:
        role = await role_service.get_role_by_id(config['role_id'])
        config['role_name'] = role['name'] if role else 'Unknown'
    
    # Apply field filtering
    user_permissions = await role_service.get_user_permissions(current_user["id"])
    
    return filter_fields_list(configs, user_permissions, AI_CONFIG_FIELD_CONFIG, ALWAYS_INCLUDE)


@router.put(
    "/configs/{config_id}",
    dependencies=[Depends(require_permission(["ai.action.configure"]))]
)
async def update_ai_config(
    config_id: int,
    config_data: AIConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update AI configuration for a role"""
    from app.services.supabase_client import supabase_client
    from app.services.audit_service import audit_logger
    
    # Build update data
    update_data = {k: v for k, v in config_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data to update"
        )
    
    response = supabase_client.table('ai_agent_configs').update(update_data).eq('id', config_id).execute()
    
    if response.data:
        # Audit log
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="UPDATE_AI_CONFIG",
            resource_type="ai_agent_config",
            resource_id=str(config_id),
            changes=update_data,
            metadata={}
        )
        
        return response.data[0]
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Config not found"
    )


@router.post(
    "/configs/{config_id}/toggle",
    dependencies=[Depends(require_permission(["ai.action.toggle"]))]
)
async def toggle_ai_config(
    config_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Toggle AI enabled/disabled for a role"""
    from app.services.supabase_client import supabase_client
    from app.services.audit_service import audit_logger
    
    # Get current state
    existing = supabase_client.table('ai_agent_configs').select('enabled').eq('id', config_id).single().execute()
    
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Config not found"
        )
    
    new_state = not existing.data['enabled']
    
    response = supabase_client.table('ai_agent_configs').update({'enabled': new_state}).eq('id', config_id).execute()
    
    if response.data:
        await audit_logger.log_action(
            user_id=current_user["id"],
            action="TOGGLE_AI_CONFIG",
            resource_type="ai_agent_config",
            resource_id=str(config_id),
            changes={"enabled": new_state},
            metadata={}
        )
        
        return {
            "message": f"AI {'enabled' if new_state else 'disabled'}",
            "enabled": new_state
        }
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to toggle"
    )
