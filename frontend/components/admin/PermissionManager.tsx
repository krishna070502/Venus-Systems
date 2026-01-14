'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Check, Search, FolderTree, Key } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Permission {
  id: number
  key: string
  description?: string
}

interface PermissionManagerProps {
  roleId: number
  roleName: string
  currentPermissions: string[]
  allPermissions: Permission[]
  onClose: () => void
  onAssign: (permissionId: number) => Promise<void>
  onRemove: (permissionId: number) => Promise<void>
}

interface PermissionTreeNode {
  name: string
  fullPath: string
  permissions: Permission[]
  children: Map<string, PermissionTreeNode>
  assignedCount: number
  totalCount: number
}

// Capitalize first letter of each word, handle special cases
const formatGroupName = (name: string): string => {
  const specialCases: Record<string, string> = {
    'pos': 'POS',
    'sku': 'SKU',
    'skus': 'SKUs',
    'api': 'API',
    'ui': 'UI',
    'rpc': 'RPC',
    'id': 'ID',
  }

  if (specialCases[name.toLowerCase()]) {
    return specialCases[name.toLowerCase()]
  }

  return name.charAt(0).toUpperCase() + name.slice(1)
}

export default function PermissionManager({
  roleId,
  roleName,
  currentPermissions,
  allPermissions,
  onClose,
  onAssign,
  onRemove,
}: PermissionManagerProps) {
  const [loading, setLoading] = useState(false)
  const [localPermissions, setLocalPermissions] = useState<string[]>(currentPermissions)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['']))
  const [searchQuery, setSearchQuery] = useState('')

  // Update local state when props change
  useEffect(() => {
    setLocalPermissions(currentPermissions)
  }, [currentPermissions])

  // Build tree structure from permissions based on prefix
  const permissionTree = useMemo(() => {
    const root: PermissionTreeNode = {
      name: 'All Permissions',
      fullPath: '',
      permissions: [],
      children: new Map(),
      assignedCount: 0,
      totalCount: 0,
    }

    // Sort permissions alphabetically for consistent display
    const sortedPermissions = [...allPermissions].sort((a, b) => a.key.localeCompare(b.key))

    sortedPermissions.forEach(permission => {
      const parts = permission.key.split('.')
      let currentNode = root

      // Navigate/create tree structure for all but the last part
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        const fullPath = parts.slice(0, i + 1).join('.')

        if (!currentNode.children.has(part)) {
          currentNode.children.set(part, {
            name: formatGroupName(part),
            fullPath,
            permissions: [],
            children: new Map(),
            assignedCount: 0,
            totalCount: 0,
          })
        }
        currentNode = currentNode.children.get(part)!
      }

      // Add permission to the final node
      currentNode.permissions.push(permission)
      currentNode.totalCount++

      // Update counts up the tree
      let updateNode = root
      for (let i = 0; i < parts.length - 1; i++) {
        updateNode.totalCount++
        if (localPermissions.includes(permission.key)) {
          updateNode.assignedCount++
        }
        updateNode = updateNode.children.get(parts[i])!
      }
      if (localPermissions.includes(permission.key)) {
        currentNode.assignedCount++
      }
    })

    return root
  }, [allPermissions, localPermissions])

  // Filter tree based on search
  const filteredPermissions = useMemo(() => {
    if (!searchQuery.trim()) return null

    const query = searchQuery.toLowerCase()
    return allPermissions.filter(p =>
      p.key.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    )
  }, [searchQuery, allPermissions])

  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const handleToggle = async (permission: Permission, isAssigned: boolean) => {
    setLoading(true)
    try {
      if (isAssigned) {
        setLocalPermissions(prev => prev.filter(p => p !== permission.key))
        await onRemove(permission.id)
      } else {
        setLocalPermissions(prev => [...prev, permission.key])
        await onAssign(permission.id)
      }
    } catch (error) {
      console.error('Failed to toggle permission:', error)
      setLocalPermissions(currentPermissions)
    } finally {
      setLoading(false)
    }
  }

  const toggleAllInNode = async (node: PermissionTreeNode, assign: boolean) => {
    setLoading(true)
    try {
      const allPerms = getAllPermissionsInNode(node)

      for (const perm of allPerms) {
        const isAssigned = localPermissions.includes(perm.key)
        if (assign && !isAssigned) {
          setLocalPermissions(prev => [...prev, perm.key])
          await onAssign(perm.id)
        } else if (!assign && isAssigned) {
          setLocalPermissions(prev => prev.filter(p => p !== perm.key))
          await onRemove(perm.id)
        }
      }
    } catch (error) {
      console.error('Failed to toggle permissions:', error)
      setLocalPermissions(currentPermissions)
    } finally {
      setLoading(false)
    }
  }

  const getAllPermissionsInNode = (node: PermissionTreeNode): Permission[] => {
    const perms = [...node.permissions]
    node.children.forEach(child => {
      perms.push(...getAllPermissionsInNode(child))
    })
    return perms
  }

  const renderPermissionItem = (permission: Permission) => {
    const isAssigned = localPermissions.includes(permission.key)
    const actionPart = permission.key.split('.').pop() || ''

    return (
      <div
        key={permission.id}
        className={cn(
          "flex items-center justify-between py-2 px-3 rounded-lg transition-all",
          isAssigned ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Key className={cn("h-3.5 w-3.5 shrink-0", isAssigned ? "text-primary" : "text-muted-foreground")} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <code className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded",
                isAssigned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {actionPart}
              </code>
              <span className="text-[10px] text-muted-foreground font-mono truncate">
                {permission.key}
              </span>
            </div>
            {permission.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {permission.description}
              </p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={isAssigned ? 'default' : 'outline'}
          onClick={() => handleToggle(permission, isAssigned)}
          disabled={loading}
          className="shrink-0 h-7 text-xs"
        >
          {isAssigned ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Assigned
            </>
          ) : (
            'Assign'
          )}
        </Button>
      </div>
    )
  }

  const renderTreeNode = (node: PermissionTreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.fullPath)
    const hasChildren = node.children.size > 0 || node.permissions.length > 0
    const allAssigned = node.assignedCount === node.totalCount && node.totalCount > 0
    const someAssigned = node.assignedCount > 0 && node.assignedCount < node.totalCount

    if (!hasChildren) return null

    return (
      <div key={node.fullPath} className={cn(depth > 0 && "ml-4 border-l pl-2")}>
        <button
          onClick={() => toggleNode(node.fullPath)}
          className={cn(
            "flex items-center gap-2 w-full p-2 rounded-lg font-medium text-left transition-all group",
            depth === 0 ? "bg-muted/50 hover:bg-muted" : "hover:bg-muted/30",
            allAssigned && "bg-primary/5"
          )}
        >
          {node.children.size > 0 ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          )}

          <span className={cn("flex-1", depth === 0 && "font-semibold")}>
            {node.name}
          </span>

          <div className="flex items-center gap-2">
            {someAssigned && (
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(node.assignedCount / node.totalCount) * 100}%` }}
                />
              </div>
            )}
            <Badge
              variant={allAssigned ? "default" : someAssigned ? "secondary" : "outline"}
              className="text-[10px] h-5 min-w-[40px] justify-center"
            >
              {node.assignedCount}/{node.totalCount}
            </Badge>

            {/* Quick toggle for entire group */}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                toggleAllInNode(node, !allAssigned)
              }}
              disabled={loading}
            >
              {allAssigned ? 'Remove All' : 'Assign All'}
            </Button>
          </div>
        </button>

        {isExpanded && (
          <div className="mt-1 space-y-1">
            {/* Render child nodes first */}
            {Array.from(node.children.values()).map(child => renderTreeNode(child, depth + 1))}

            {/* Then render permissions in this node */}
            {node.permissions.length > 0 && (
              <div className={cn("space-y-1", node.children.size > 0 && "mt-2 pt-2 border-t border-dashed")}>
                {node.permissions.map(p => renderPermissionItem(p))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                Manage Permissions for {roleName}
              </CardTitle>
              <CardDescription className="mt-1">
                Permissions are automatically organized by their prefix. Click groups to expand.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm h-8 px-3">
              {localPermissions.length} / {allPermissions.length} assigned
            </Badge>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {filteredPermissions ? (
            <div className="space-y-1">
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map(p => renderPermissionItem(p))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No permissions found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from(permissionTree.children.values()).map(child => renderTreeNode(child, 0))}
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t flex justify-between items-center bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {localPermissions.length} permissions assigned to this role
          </p>
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}
