import React, { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';

interface ResponsiveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}

/**
 * ResponsiveDialog component that shows Dialog on desktop and Sheet on mobile
 * Following Mobile-First best practices
 */
export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className = ''
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className={className}>
                    {(title || description) && (
                        <SheetHeader>
                            {title && <SheetTitle>{title}</SheetTitle>}
                            {description && <SheetDescription>{description}</SheetDescription>}
                        </SheetHeader>
                    )}
                    <div className="py-4">{children}</div>
                    {footer && <SheetFooter>{footer}</SheetFooter>}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={className}>
                {(title || description) && (
                    <DialogHeader>
                        {title && <DialogTitle>{title}</DialogTitle>}
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                )}
                {children}
                {footer && <DialogFooter>{footer}</DialogFooter>}
            </DialogContent>
        </Dialog>
    );
};
