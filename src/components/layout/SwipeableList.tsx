
import React, { useRef, useState } from 'react';
import { Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// Simple Swipeable Item using CSS Scroll Snap
// Structure: [Action Left] [Content] [Action Right]
// Snap points ensure it settles on Content.

interface SwipeableItemProps {
    children: React.ReactNode;
    onEdit?: () => void;
    onDelete?: () => void;
    actions?: React.ReactNode;
    className?: string;
}

export const SwipeableItem: React.FC<SwipeableItemProps> = ({
    children,
    onEdit,
    onDelete,
    actions,
    className
}) => {
    return (
        <div className={cn("group relative overflow-hidden bg-background border rounded-xl shadow-sm transition-all hover:shadow-md", className)}>
            <div className="p-3 sm:p-4 flex justify-between items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                    {children}
                </div>

                {/* Actions visible on desktop */}
                <div className="hidden sm:flex items-center gap-2">
                    {actions}
                    {onEdit && (
                        <button onClick={onEdit} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                            <Edit className="h-4 w-4" />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Mobile Action Menu */}
                <div className="sm:hidden">
                    <div className="flex items-center gap-3">
                        {actions}
                        {onEdit && (
                            <button onClick={onEdit} className="p-2 bg-muted/50 rounded-full text-primary">
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={onDelete} className="p-2 bg-muted/50 rounded-full text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SwipeableList: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
    return (
        <div className={cn("space-y-3", className)}>
            {children}
        </div>
    );
};
