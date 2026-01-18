'use client'

import { useState, useMemo } from 'react'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Maximize2, Minimize2, X, ChevronUp, ChevronDown } from 'lucide-react'
import { WidgetConfig } from '@/lib/hooks/useDashboard'
import { cn } from '@/lib/utils'

interface SortableWidgetProps {
    widget: WidgetConfig
    children: React.ReactNode
    onRemove: () => void
    onResize: (size: 'half' | 'full') => void
    onMove: (direction: 'up' | 'down') => void
    editable: boolean
    isEditMode: boolean
}

function SortableWidget({
    widget,
    children,
    onRemove,
    onResize,
    onMove,
    editable,
    isEditMode
}: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group",
                widget.size === 'full' ? 'col-span-full' : 'col-span-1',
                isDragging && 'opacity-50 z-50'
            )}
        >
            {/* Drag Handle & Controls - only visible in edit mode */}
            {editable && isEditMode && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border rounded-full shadow-lg px-2 py-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-accent rounded cursor-grab active:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {/* Move Up */}
                    <button
                        onClick={() => onMove('up')}
                        className="p-1 hover:bg-accent rounded"
                        title="Move up"
                    >
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {/* Move Down */}
                    <button
                        onClick={() => onMove('down')}
                        className="p-1 hover:bg-accent rounded"
                        title="Move down"
                    >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>

                    {/* Resize Toggle */}
                    <button
                        onClick={() => onResize(widget.size === 'full' ? 'half' : 'full')}
                        className="p-1 hover:bg-accent rounded"
                        title={widget.size === 'full' ? 'Make half width' : 'Make full width'}
                    >
                        {widget.size === 'full' ? (
                            <Minimize2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    {/* Remove */}
                    <button
                        onClick={onRemove}
                        className="p-1 hover:bg-destructive/10 rounded"
                        title="Remove widget"
                    >
                        <X className="h-4 w-4 text-destructive" />
                    </button>
                </div>
            )}

            {/* Widget Content */}
            <div className={cn(
                "bg-card rounded-2xl border shadow-sm overflow-hidden transition-all",
                isEditMode && editable && "ring-2 ring-primary/20 ring-offset-2"
            )}>
                {children}
            </div>
        </div>
    )
}

interface DraggableWidgetGridProps {
    widgets: WidgetConfig[]
    onReorder: (widgets: WidgetConfig[]) => void
    onRemove: (widgetId: string) => void
    onResize: (widgetId: string, size: 'half' | 'full') => void
    onMove: (widgetId: string, direction: 'up' | 'down') => void
    renderWidget: (widget: WidgetConfig) => React.ReactNode
    editable: boolean
    isEditMode: boolean
}

export function DraggableWidgetGrid({
    widgets,
    onReorder,
    onRemove,
    onResize,
    onMove,
    renderWidget,
    editable,
    isEditMode,
}: DraggableWidgetGridProps) {
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const activeWidget = useMemo(
        () => widgets.find(w => w.id === activeId),
        [widgets, activeId]
    )

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (over && active.id !== over.id) {
            const oldIndex = widgets.findIndex(w => w.id === active.id)
            const newIndex = widgets.findIndex(w => w.id === over.id)

            const reordered = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({
                ...w,
                position: i
            }))

            onReorder(reordered)
        }
    }

    const handleDragCancel = () => {
        setActiveId(null)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={widgets.map(w => w.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {widgets.map((widget) => (
                        <SortableWidget
                            key={widget.id}
                            widget={widget}
                            onRemove={() => onRemove(widget.id)}
                            onResize={(size) => onResize(widget.id, size)}
                            onMove={(direction) => onMove(widget.id, direction)}
                            editable={editable}
                            isEditMode={isEditMode}
                        >
                            {renderWidget(widget)}
                        </SortableWidget>
                    ))}
                </div>
            </SortableContext>

            {/* Drag Overlay - shows dragged item */}
            <DragOverlay>
                {activeWidget ? (
                    <div className="bg-card rounded-2xl border-2 border-primary shadow-2xl opacity-90 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <GripVertical className="h-4 w-4" />
                            Moving widget...
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
