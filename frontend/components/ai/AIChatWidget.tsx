'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePermissions, hasPermission } from '@/lib/auth/usePermissions'
import { api } from '@/lib/api/client'
import {
    MessageSquare,
    X,
    Send,
    Loader2,
    Bot,
    User,
    Sparkles,
    Trash2,
    Plus,
    ChevronLeft,
    Database,
    Cpu,
    Maximize2,
    Minimize2
} from 'lucide-react'

interface Message {
    id: string
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string
    created_at?: string
}

interface Conversation {
    id: string
    title: string
    created_at: string
}

interface AIStatus {
    available: boolean
    enabled: boolean
    has_permission: boolean
    allowed_tables: string[]
}

export default function AIChatWidget() {
    const { permissions, loading: permissionsLoading } = usePermissions()
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<AIStatus | null>(null)
    const [viewSize, setViewSize] = useState<'compact' | 'standard' | 'full'>('compact')
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [currentConversation, setCurrentConversation] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const canUseAI = !permissionsLoading && hasPermission(permissions, 'ai.chat')
    const pathname = usePathname()

    useEffect(() => {
        if (isOpen && canUseAI) {
            fetchStatus()
            fetchConversations()
        }
    }, [isOpen, canUseAI])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchStatus = async () => {
        try {
            const data = await api.ai.getStatus() as AIStatus
            setStatus(data)
        } catch (error) {
            console.error('Failed to fetch AI status:', error)
        }
    }

    const fetchConversations = async () => {
        try {
            const data = await api.ai.getConversations() as Conversation[]
            setConversations(data)
        } catch (error) {
            console.error('Failed to fetch conversations:', error)
        }
    }

    const loadConversation = async (id: string) => {
        try {
            const data = await api.ai.getConversation(id) as { messages: Message[] }
            setMessages(data.messages || [])
            setCurrentConversation(id)
            setShowHistory(false)
        } catch (error) {
            console.error('Failed to load conversation:', error)
        }
    }

    const startNewConversation = () => {
        setCurrentConversation(null)
        setMessages([])
        setShowHistory(false)
    }

    const deleteConversation = async (id: string) => {
        try {
            await api.ai.deleteConversation(id)
            setConversations(prev => prev.filter(c => c.id !== id))
            if (currentConversation === id) {
                startNewConversation()
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error)
        }
    }

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            const response = await api.ai.chat(userMessage.content, currentConversation || undefined, pathname) as {
                conversation_id: string
                response: string
                error?: string
            }

            if (!currentConversation && response.conversation_id) {
                setCurrentConversation(response.conversation_id)
                fetchConversations()
            }

            if (response.error) {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `⚠️ ${response.error}`
                }])
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.response
                }])
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `❌ Error: ${error.message || 'Failed to get response'}`
            }])
        } finally {
            setLoading(false)
        }
    }

    if (!canUseAI) {
        return null
    }

    return (
        <>
            {/* Floating Button - Enhanced with gradient and glow */}
            <button
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-purple-500/25 overflow-hidden border-2 border-purple-500/50"
                onClick={() => setIsOpen(true)}
                style={{
                    display: isOpen ? 'none' : 'flex',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
                }}
            >
                <img src="/invy-logo.png" alt="Invy Logo" className="h-full w-full object-cover" />
            </button>

            {/* Chat Window - Enhanced with glassmorphism */}
            {isOpen && (
                <div
                    className={`fixed z-50 flex flex-col rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out shadow-2xl ${viewSize === 'full'
                        ? 'w-[calc(100vw-48px)] h-[calc(100vh-48px)] top-6 left-6'
                        : viewSize === 'standard'
                            ? 'bottom-6 right-6 w-[800px] h-[800px]'
                            : 'bottom-6 right-6 w-[420px] h-[650px]'
                        }`}
                    style={{
                        background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.98) 0%, rgba(10, 10, 20, 0.99) 100%)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    {/* Header - Gradient with branding */}
                    <div
                        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)'
                        }}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {showHistory && (
                                <button
                                    onClick={() => setShowHistory(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                                >
                                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                                </button>
                            )}
                            <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10"
                                style={{
                                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
                                }}
                            >
                                <img src="/invy-logo.png" alt="Invy Logo" className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-white text-lg tracking-tight truncate">Invy</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-xs text-gray-400 truncate">Your Assistant</p>
                                    {status?.available && (
                                        <div
                                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold"
                                            style={{
                                                background: status.enabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                                color: status.enabled ? '#4ade80' : '#fbbf24',
                                                border: `1px solid ${status.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                                            }}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${status.enabled ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                            {status.enabled ? 'Online' : 'Offline'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                            {viewSize !== 'compact' && (
                                <button
                                    onClick={() => setViewSize(viewSize === 'full' ? 'standard' : 'compact')}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                                    title={`Minimize to ${viewSize === 'full' ? 'Standard (800x800)' : 'Compact (420x650)'}`}
                                >
                                    <Minimize2 className="h-4 w-4" />
                                </button>
                            )}
                            {viewSize !== 'full' && (
                                <button
                                    onClick={() => setViewSize(viewSize === 'compact' ? 'standard' : 'full')}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                                    title={`Maximize to ${viewSize === 'compact' ? 'Standard (800x800)' : 'Full (Ultra)'}`}
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                                title="History"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </button>
                            <button
                                onClick={startNewConversation}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                                title="New Chat"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                                title="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {showHistory ? (
                            // Conversation History
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">Recent Conversations</p>
                                {conversations.length === 0 ? (
                                    <div className="text-center py-8">
                                        <MessageSquare className="h-8 w-8 mx-auto text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-500">No conversations yet</p>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all border border-transparent hover:border-white/10"
                                            onClick={() => loadConversation(conv.id)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-200 truncate">{conv.title}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(conv.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <button
                                                className="p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-500/20"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteConversation(conv.id)
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Chat Messages
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="text-center py-12">
                                            <div
                                                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                                    border: '1px solid rgba(139, 92, 246, 0.2)'
                                                }}
                                            >
                                                <Sparkles className="h-8 w-8 text-purple-400" />
                                            </div>
                                            <h4 className="text-white font-semibold mb-2">Welcome to Invy</h4>
                                            <p className="text-gray-400 text-sm mb-4">
                                                Ask me anything about your business data
                                            </p>
                                            {status?.allowed_tables && status.allowed_tables.length > 0 && (
                                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    <Database className="h-3 w-3 text-gray-500" />
                                                    <span className="text-xs text-gray-500">
                                                        {status.allowed_tables.slice(0, 4).join(' • ')}
                                                        {status.allowed_tables.length > 4 && ` +${status.allowed_tables.length - 4} more`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {messages
                                        .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim())
                                        .map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {msg.role === 'assistant' && (
                                                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/5">
                                                        <img src="/invy-logo.png" alt="Invy" className="h-full w-full object-cover" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                                        : 'bg-white/5 text-gray-200 border border-white/10'
                                                        }`}
                                                >
                                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                </div>
                                                {msg.role === 'user' && (
                                                    <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-4 w-4 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    {loading && (
                                        <div className="flex gap-3">
                                            <div className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden border border-white/5">
                                                <img src="/invy-logo.png" alt="Invy" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                                    <span className="text-sm text-gray-400">Thinking...</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area - Enhanced */}
                                <div
                                    className="p-4"
                                    style={{
                                        background: 'linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.05) 100%)',
                                        borderTop: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            sendMessage()
                                        }}
                                        className="flex gap-3"
                                    >
                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask Invy anything..."
                                            disabled={loading || !status?.enabled}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all disabled:opacity-50"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || !input.trim() || !status?.enabled}
                                            className="px-4 rounded-xl font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                                            style={{
                                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                                boxShadow: input.trim() && !loading ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none'
                                            }}
                                        >
                                            {loading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
