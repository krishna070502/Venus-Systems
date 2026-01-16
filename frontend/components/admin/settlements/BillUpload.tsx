'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, FileImage, File, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface BillUploadProps {
    storeId: number
    settlementId?: string
    files: string[]  // Array of storage URLs
    onChange: (files: string[]) => void
    disabled?: boolean
    maxFiles?: number
    maxSizeMB?: number
}

interface UploadingFile {
    name: string
    progress: number
}

export function BillUpload({
    storeId,
    settlementId,
    files,
    onChange,
    disabled = false,
    maxFiles = 5,
    maxSizeMB = 5
}: BillUploadProps) {
    const [uploading, setUploading] = useState<UploadingFile[]>([])
    const [error, setError] = useState<string | null>(null)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf'
    ]

    const maxSizeBytes = maxSizeMB * 1024 * 1024

    const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return
        setError(null)

        const remainingSlots = maxFiles - files.length
        if (remainingSlots <= 0) {
            setError(`Maximum ${maxFiles} files allowed`)
            return
        }

        const filesToUpload = Array.from(selectedFiles).slice(0, remainingSlots)

        // Validate files
        for (const file of filesToUpload) {
            if (!allowedTypes.includes(file.type)) {
                setError(`Invalid file type: ${file.name}. Only images and PDFs allowed.`)
                return
            }
            if (file.size > maxSizeBytes) {
                setError(`File too large: ${file.name}. Maximum ${maxSizeMB}MB allowed.`)
                return
            }
        }

        // Upload files
        const supabase = createClient()
        const newUrls: string[] = []

        for (const file of filesToUpload) {
            const uploadingFile = { name: file.name, progress: 0 }
            setUploading(prev => [...prev, uploadingFile])

            try {
                // Generate unique path: {store_id}/{settlement_id or temp}/{timestamp}_{filename}
                const folder = settlementId || 'temp'
                const timestamp = Date.now()
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const path = `${storeId}/${folder}/${timestamp}_${safeName}`

                const { data, error: uploadError } = await supabase.storage
                    .from('expense-receipts')
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    throw uploadError
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('expense-receipts')
                    .getPublicUrl(path)

                newUrls.push(publicUrl)
            } catch (err: any) {
                console.error('Upload error:', err)
                setError(`Failed to upload ${file.name}: ${err.message}`)
            } finally {
                setUploading(prev => prev.filter(f => f.name !== file.name))
            }
        }

        if (newUrls.length > 0) {
            onChange([...files, ...newUrls])
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [files, maxFiles, maxSizeBytes, maxSizeMB, onChange, settlementId, storeId, allowedTypes])

    const handleRemove = useCallback(async (url: string) => {
        // Extract path from URL to delete from storage
        try {
            const supabase = createClient()
            const path = url.split('/expense-receipts/')[1]
            if (path) {
                await supabase.storage.from('expense-receipts').remove([path])
            }
        } catch (err) {
            console.error('Failed to delete file:', err)
        }
        onChange(files.filter(f => f !== url))
    }, [files, onChange])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        if (!disabled) {
            handleFileSelect(e.dataTransfer.files)
        }
    }, [disabled, handleFileSelect])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        if (!disabled) {
            setDragOver(true)
        }
    }, [disabled])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
    }, [])

    const getFileIcon = (url: string) => {
        if (url.toLowerCase().endsWith('.pdf')) {
            return <File className="h-6 w-6 text-red-500" />
        }
        return <FileImage className="h-6 w-6 text-blue-500" />
    }

    const getFileName = (url: string) => {
        const parts = url.split('/')
        const fullName = parts[parts.length - 1]
        // Remove timestamp prefix
        const underscoreIndex = fullName.indexOf('_')
        return underscoreIndex > 0 ? fullName.substring(underscoreIndex + 1) : fullName
    }

    const isImageUrl = (url: string) => {
        const lower = url.toLowerCase()
        return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') ||
            lower.endsWith('.webp') || lower.endsWith('.gif')
    }

    return (
        <div className="space-y-3">
            {/* Upload Area */}
            {files.length < maxFiles && !disabled && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={allowedTypes.join(',')}
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                        disabled={disabled}
                    />
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                        Drop bills here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Images or PDF, max {maxSizeMB}MB each ({files.length}/{maxFiles} uploaded)
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Uploading Files */}
            {uploading.length > 0 && (
                <div className="space-y-2">
                    {uploading.map((file) => (
                        <div key={file.name} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm font-medium truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Uploaded Files Grid */}
            {files.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {files.map((url, index) => (
                        <div
                            key={index}
                            className="relative group border rounded-xl overflow-hidden bg-muted/20 aspect-square"
                        >
                            {isImageUrl(url) ? (
                                <img
                                    src={url}
                                    alt={`Bill ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                    {getFileIcon(url)}
                                    <span className="text-[10px] text-muted-foreground mt-1 text-center truncate max-w-full">
                                        {getFileName(url)}
                                    </span>
                                </div>
                            )}

                            {/* View/Delete overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <FileImage className="h-4 w-4 text-white" />
                                </a>
                                {!disabled && (
                                    <button
                                        onClick={() => handleRemove(url)}
                                        className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
