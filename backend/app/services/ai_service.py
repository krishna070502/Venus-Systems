"""
AI Service
==========
AI assistant service powered by NVIDIA NIM with database awareness and role-based permissions.
"""

import json
import logging
from typing import List, Dict, Any, Optional, AsyncGenerator
from datetime import datetime
import httpx

from app.config.settings import settings
from app.services.supabase_client import supabase_client
from app.services.role_service import RoleService

logger = logging.getLogger(__name__)


class NVIDIANIMClient:
    """Client for NVIDIA NIM API (OpenAI-compatible)"""
    
    def __init__(self):
        self.api_key = settings.NVIDIA_NIM_API_KEY or ""
        self.base_url = settings.NVIDIA_NIM_BASE_URL
        self.model = settings.NVIDIA_NIM_MODEL
        
        if not self.api_key:
            logger.warning("NVIDIA_NIM_API_KEY not set - AI features will be disabled")
    
    @property
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict]] = None,
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> Dict[str, Any]:
        """Send chat completion request to NVIDIA NIM"""
        
        if not self.is_available:
            return {
                "error": "AI service not configured. Please set NVIDIA_NIM_API_KEY.",
                "choices": []
            }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
            # Some NIM models (like Llama 3.3) only support single tool calls
            payload["parallel_tool_calls"] = False
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"NVIDIA NIM API error: {e.response.status_code} - {e.response.text}")
                return {"error": str(e), "choices": []}
            except Exception as e:
                logger.error(f"NVIDIA NIM request failed: {e}")
                return {"error": str(e), "choices": []}


class DatabaseTools:
    """Tools for AI to query the database"""
    
    @staticmethod
    def get_tool_definitions(allowed_tables: List[str]) -> List[Dict]:
        """Get tool definitions for the AI"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "query_database",
                    "description": f"Query the database to get information. Available tables: {', '.join(allowed_tables)}",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "table": {
                                "type": "string",
                                "description": f"The table to query. Must be one of: {', '.join(allowed_tables)}",
                                "enum": allowed_tables
                            },
                            "select": {
                                "type": "string",
                                "description": "Columns to select (comma-separated). Use * for all columns."
                            },
                            "filters": {
                                "type": "object",
                                "description": "Filters to apply. Keys are column names, values are the values to match.",
                                "additionalProperties": True
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of rows to return",
                                "default": 10
                            }
                        },
                        "required": ["table", "select"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "count_rows",
                    "description": "Count rows in a table with optional filters",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "table": {
                                "type": "string",
                                "description": f"The table to count. Must be one of: {', '.join(allowed_tables)}",
                                "enum": allowed_tables
                            },
                            "filters": {
                                "type": "object",
                                "description": "Filters to apply before counting",
                                "additionalProperties": True
                            }
                        },
                        "required": ["table"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_schema_info",
                    "description": "Get detailed metadata about a table (columns, types, constraints)",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "table": {
                                "type": "string",
                                "description": "The table to inspect"
                            }
                        },
                        "required": ["table"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "discover_tables",
                    "description": "List all tables available in the current database schema",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "retrieve_knowledge",
                    "description": "Search business policies, SOPs, and internal documents for rules and procedures",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The business question or topic to search for"
                            }
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_knowledge_base",
                    "description": "Store a new business rule, SOP, or policy provided by the user into the knowledge base",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The business rule or information to record"
                            },
                            "metadata": {
                                "type": "object",
                                "description": "Optional metadata like title or category",
                                "additionalProperties": True
                            }
                        },
                        "required": ["content"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_system_health",
                    "description": "Get real-time system health metrics including CPU, memory, and database status",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
        ]
    
    @staticmethod
    async def execute_tool(
        tool_name: str,
        arguments: Dict[str, Any],
        allowed_tables: List[str]
    ) -> str:
        """Execute a tool and return the result"""
        
        table = arguments.get("table")
        
        # Security: Verify table is allowed
        if table and table not in allowed_tables:
            return json.dumps({"error": f"Access denied to table: {table}"})
        
        try:
            if tool_name == "query_database":
                select = arguments.get("select", "*")
                filters = arguments.get("filters", {})
                try:
                    raw_limit = int(arguments.get("limit", 100))
                except (ValueError, TypeError):
                    raw_limit = 100
                limit = min(raw_limit, 200)
                
                query = supabase_client.table(table).select(select).limit(limit)
                
                for key, value in filters.items():
                    # Handle list-like values (actual lists or comma-separated strings)
                    if isinstance(value, list):
                        query = query.in_(key, value)
                    elif isinstance(value, str) and ',' in value:
                        # Convert comma-separated string to list of trimmed strings
                        list_val = [v.strip() for v in value.split(',')]
                        # Try to convert to ints if they look like numbers
                        try:
                            if all(v.isdigit() or (v.startswith('-') and v[1:].isdigit()) for v in list_val):
                                list_val = [int(v) for v in list_val]
                        except: pass
                        query = query.in_(key, list_val)
                    else:
                        # Basic type coercion for single values: try int if it looks like one
                        if isinstance(value, str) and value.isdigit():
                            try: value = int(value)
                            except: pass
                        query = query.eq(key, value)
                
                result = query.execute()
                return json.dumps({"data": result.data, "count": len(result.data)})
            
            elif tool_name == "count_rows":
                filters = arguments.get("filters", {})
                
                query = supabase_client.table(table).select("*", count="exact")
                
                for key, value in filters.items():
                    query = query.eq(key, value)
                
                result = query.execute()
                return json.dumps({"count": result.count or len(result.data)})
            
            elif tool_name == "get_schema_info":
                # Enhanced discovery: Use RPC if available, fallback to sample row
                try:
                    rpc_result = supabase_client.rpc('get_table_metadata', {'p_table_name': table}).execute()
                    if rpc_result.data:
                        return json.dumps(rpc_result.data)
                except Exception as rpc_err:
                    logger.debug(f"RPC get_table_metadata failed: {rpc_err}")
                
                # Fallback to inference
                result = supabase_client.table(table).select("*").limit(1).execute()
                if result.data:
                    return json.dumps({
                        "table": table,
                        "columns": list(result.data[0].keys()),
                        "sample_types": {k: type(v).__name__ for k, v in result.data[0].items()},
                        "note": "Inferred schema. RPC 'get_table_metadata' highly recommended for precision."
                    })
                return json.dumps({"table": table, "columns": [], "error": "Table empty and RPC metadata discovery failed."})

            elif tool_name == "discover_tables":
                # Always return the allowed tables for this user
                # RPC is optional enhancement
                tables_info = {
                    "available_tables": allowed_tables,
                    "page_table_mapping": {
                        "/admin/business/inventory/items-purchase": {"table": "inventory_items", "filter": {"item_type": "purchase"}},
                        "/admin/business/inventory/stock": {"table": "inventory_items", "filter": {}},
                        "/admin/users": {"table": "profiles", "filter": {}},
                        "/admin/roles": {"table": "roles", "filter": {}},
                        "/admin/permissions": {"table": "permissions", "filter": {}},
                        "/admin/sessions": {"table": "user_sessions", "filter": {}},
                        "/admin/logs": {"table": "audit_logs", "filter": {}},
                    }
                }
                return json.dumps(tables_info)

            elif tool_name == "retrieve_knowledge":
                from app.services.knowledge_service import knowledge_service
                query = arguments.get("query")
                result = await knowledge_service.search(query)
                return json.dumps({"relevant_documents": result})

            elif tool_name == "update_knowledge_base":
                from app.services.knowledge_service import knowledge_service
                content = arguments.get("content")
                metadata = arguments.get("metadata", {})
                metadata["source"] = "User Chat Update"
                
                embedding = await knowledge_service.get_embedding(content)
                if embedding:
                    db_res = supabase_client.table('knowledge_base').insert({
                        "content": content,
                        "metadata": metadata,
                        "embedding": embedding
                    }).execute()
                    return json.dumps({"status": "success", "message": "Knowledge recorded successfully.", "id": db_res.data[0]['id'] if db_res.data else None})
                return json.dumps({"status": "error", "message": "Failed to generate embedding for new knowledge."})

            elif tool_name == "get_system_health":
                import psutil
                import time
                
                # System Metrics
                cpu = psutil.cpu_percent(interval=0.1)
                mem = psutil.virtual_memory()
                
                # DB Latency check
                db_start = time.time()
                supabase_client.table("profiles").select("id").limit(1).execute()
                db_latency = (time.time() - db_start) * 1000
                
                return json.dumps({
                    "status": "Running",
                    "cpu_usage": f"{cpu}%",
                    "memory": {
                        "total_gb": round(mem.total / (1024**3), 2),
                        "available_gb": round(mem.available / (1024**3), 2),
                        "usage_percent": f"{mem.percent}%"
                    },
                    "database": {
                        "latency_ms": round(db_latency, 2),
                        "status": "Connected"
                    },
                    "timestamp": datetime.now().isoformat()
                })
            
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
            
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return json.dumps({"error": str(e)})


class AIService:
    """Main AI service with conversation management and permission checks"""
    
    def __init__(self):
        self.nim_client = NVIDIANIMClient()
        self.role_service = RoleService()
    
    async def get_user_ai_config(self, user_id: str) -> Optional[Dict]:
        """Get AI configuration for user based on their roles"""
        
        # Get user's role IDs
        user_roles = supabase_client.table('user_roles').select('role_id').eq('user_id', user_id).execute()
        
        if not user_roles.data:
            return None
        
        role_ids = [r['role_id'] for r in user_roles.data]
        
        # Get best config (most permissive)
        configs = supabase_client.table('ai_agent_configs').select('*').in_('role_id', role_ids).eq('enabled', True).execute()
        
        if not configs.data:
            return None
        
        # Merge configs - use most permissive settings
        merged = {
            "enabled": True,
            "allowed_tables": [],
            "allowed_pages": [],
            "can_execute_actions": False,
            "max_queries_per_hour": 0
        }
        
        for config in configs.data:
            merged["allowed_tables"] = list(set(merged["allowed_tables"] + (config.get("allowed_tables") or [])))
            merged["allowed_pages"] = list(set(merged["allowed_pages"] + (config.get("allowed_pages") or [])))
            merged["can_execute_actions"] = merged["can_execute_actions"] or config.get("can_execute_actions", False)
            merged["max_queries_per_hour"] = max(merged["max_queries_per_hour"], config.get("max_queries_per_hour", 0))
        
        return merged
    
    async def check_ai_permission(self, user_id: str) -> bool:
        """Check if user has permission to use AI"""
        user_permissions = await self.role_service.get_user_permissions(user_id)
        return "ai.chat" in user_permissions
    
    async def create_conversation(self, user_id: str, title: str = "New Conversation") -> Dict:
        """Create a new conversation"""
        result = supabase_client.table('ai_conversations').insert({
            "user_id": user_id,
            "title": title
        }).execute()
        
        return result.data[0] if result.data else {}
    
    async def get_conversations(self, user_id: str) -> List[Dict]:
        """Get user's conversations"""
        result = supabase_client.table('ai_conversations').select('*').eq('user_id', user_id).order('updated_at', desc=True).limit(50).execute()
        return result.data or []
    
    async def update_conversation_title(self, conversation_id: str, title: str) -> bool:
        """Update a conversation's title"""
        result = supabase_client.table('ai_conversations').update({"title": title}).eq('id', conversation_id).execute()
        return bool(result.data)
    
    async def generate_conversation_title(self, conversation_id: str, first_message: str):
        """Generate a short title for a conversation based on the first message"""
        try:
            prompt = f"Generate a very short, 3-5 word descriptive title for a chat that starts with this message: '{first_message}'. Return ONLY the title text, no quotes or surrounding text."
            
            response = await self.nim_client.chat_completion([
                {"role": "system", "content": "You generate concise chat titles (3-5 words)."},
                {"role": "user", "content": prompt}
            ])
            
            if response.get("choices"):
                title = response["choices"][0]["message"]["content"].strip().replace('"', '').replace("'", "")
                if title:
                    await self.update_conversation_title(conversation_id, title)
        except Exception as e:
            logger.error(f"Title generation failure: {e}")

    async def get_messages(self, conversation_id: str) -> List[Dict]:
        """Get messages for a conversation"""
        result = supabase_client.table('ai_messages').select('*').eq('conversation_id', conversation_id).order('created_at').execute()
        return result.data or []
    
    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: Optional[List] = None,
        tool_call_id: Optional[str] = None
    ) -> Dict:
        """Add a message to a conversation"""
        data = {
            "conversation_id": conversation_id,
            "role": role,
            "content": content
        }
        
        if tool_calls:
            data["tool_calls"] = tool_calls
        if tool_call_id:
            data["tool_call_id"] = tool_call_id
        
        result = supabase_client.table('ai_messages').insert(data).execute()
        
        # Update conversation updated_at
        supabase_client.table('ai_conversations').update({"updated_at": datetime.utcnow().isoformat()}).eq('id', conversation_id).execute()
        
        return result.data[0] if result.data else {}
    
    async def chat(
        self,
        user_id: str,
        conversation_id: str,
        message: str,
        current_page: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a chat message with tool calling support"""
        
        # Check permission
        if not await self.check_ai_permission(user_id):
            return {"error": "You don't have permission to use the AI assistant"}
        
        # Get AI config for user
        ai_config = await self.get_user_ai_config(user_id)
        
        if not ai_config:
            return {"error": "AI is not enabled for your role"}
        
        allowed_tables = ai_config.get("allowed_tables", [])
        
        # Get conversation history
        messages = await self.get_messages(conversation_id)
        
        # If this is a new conversation (no messages yet except the system), generate title
        # We do this asynchronously so it doesn't block the chat
        import asyncio
        if not messages:
            asyncio.create_task(self.generate_conversation_title(conversation_id, message))
        
        # Get current user profile for personalization
        from app.services.user_service import UserService
        user_service = UserService()
        user_profile = await user_service.get_user_by_id(user_id)
        user_context = ""
        if user_profile:
            user_context = f"\nCURRENT USER: Name: {user_profile.get('full_name')}, Email: {user_profile.get('email')}, ID: {user_id}"
        
        # Build messages for API
        api_messages = [
            {
                "role": "system",
                "content": f"""You are Invy, the AI assistant for Venus Chicken (India). Currency: INR (₹).
{user_context}
Current page: {current_page or 'unknown'}

## CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS:
You CANNOT answer questions without first calling a tool. If you try to answer without using a tool, you will be WRONG.

## YOUR FIRST ACTION FOR EVERY QUESTION:
- If the question is about app features, pages, permissions, or business rules → Call 'retrieve_knowledge' with the question
- If the question is about data counts or records → Call 'discover_tables' first, then 'query_database'
- If unsure → Call 'retrieve_knowledge' with the question

## AVAILABLE TOOLS:
1. retrieve_knowledge(query) - Search app documentation and business rules. USE THIS FOR MOST QUESTIONS.
2. discover_tables() - List available database tables with page mappings
3. query_database(table, select, filters, limit) - Get data from database
4. count_rows(table, filters) - Count records
5. get_schema_info(table) - Get table columns
6. get_system_health() - System stats

## EXAMPLES:
Q: "What permissions do I need for the sales page?"
A: Call retrieve_knowledge("sales page permissions") → Read result → Provide answer

Q: "How many users are there?"  
A: Call count_rows(table="profiles") → Read result → Provide answer

Q: "What is the last purchase item?"
A: Call query_database(table="inventory_items", select="*", filters={{"item_type":"purchase"}}, limit=1) → Read result → Provide answer

NEVER say "I need more information" or "Please provide more details". ALWAYS call a tool first."""
            }
        ]
        
        # Add history (last 30 messages for more context)
        for msg in messages[-30:]:
            msg_obj = {
                "role": msg["role"],
                "content": msg["content"]
            }
            if msg.get("tool_calls"):
                msg_obj["tool_calls"] = msg["tool_calls"]
            if msg.get("tool_call_id"):
                msg_obj["tool_call_id"] = msg["tool_call_id"]
            api_messages.append(msg_obj)
        
        # Add current message
        api_messages.append({"role": "user", "content": message})
        
        # Save user message
        await self.add_message(conversation_id, "user", message)
        
        # Get tools
        tools = DatabaseTools.get_tool_definitions(allowed_tables) if allowed_tables else None
        
        # Call NVIDIA NIM in a loop for tool execution
        max_turns = 20
        turn = 0
        all_tool_calls = []
        
        while turn < max_turns:
            turn += 1
            response = await self.nim_client.chat_completion(api_messages, tools=tools if turn == 1 or all_tool_calls else tools)
            
            if "error" in response:
                logger.error(f"NIM error: {response['error']}")
                return {"error": response["error"]}
            
            if not response.get("choices"):
                return {"error": "No response from AI"}
            
            choice = response["choices"][0]
            assistant_message = choice.get("message", {})
            content = assistant_message.get("content") or ""
            
            # Check for tool calls
            tool_calls = assistant_message.get("tool_calls")
            
            if tool_calls:
                # Add assistant message with tool calls to history
                await self.add_message(
                    conversation_id,
                    "assistant",
                    content,
                    tool_calls=tool_calls
                )
                
                # Update context for next turn
                api_messages.append({
                    "role": "assistant",
                    "content": content,
                    "tool_calls": tool_calls
                })
                
                # Execute tools
                for tool_call in tool_calls:
                    func = tool_call.get("function", {})
                    tool_name = func.get("name")
                    
                    try:
                        arguments = json.loads(func.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        arguments = {}
                    
                    result = await DatabaseTools.execute_tool(tool_name, arguments, allowed_tables)
                    
                    # Save tool response to DB for persistence
                    await self.add_message(
                        conversation_id,
                        "tool",
                        result,
                        tool_call_id=tool_call.get("id")
                    )

                    tool_result_msg = {
                        "tool_call_id": tool_call.get("id"),
                        "role": "tool",
                        "content": result
                    }
                    api_messages.append(tool_result_msg)
                    # We don't save tool results and tool calls as separate chat messages with roles, 
                    # but they are in the LLM context.
                
                all_tool_calls.extend(tool_calls)
                # Continue loop to let AI digest tool results
                continue
            else:
                # No more tool calls, we have a final response
                await self.add_message(conversation_id, "assistant", content)
                return {"response": content, "tool_calls": all_tool_calls if all_tool_calls else None}
        
        return {"error": "Maximum conversation turns reached without a final response."}

    async def delete_conversation(self, user_id: str, conversation_id: str) -> bool:
        """Delete a conversation (verifies ownership)"""
        result = supabase_client.table('ai_conversations').delete().eq('id', conversation_id).eq('user_id', user_id).execute()
        return bool(result.data)


# Global instance
ai_service = AIService()
