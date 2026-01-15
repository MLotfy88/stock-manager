import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMediaQuery } from '@/hooks/use-mobile';

interface ResponsiveTableProps<T> {
    data: T[];
    desktopTable: JSX.Element;
    mobileCard: (item: T, index: number) => JSX.Element;
    loading?: boolean;
    emptyMessage?: string;
}

/**
 * Responsive Table Component
 * Shows table on desktop, cards on mobile
 */
export function ResponsiveTable<T>({
    data,
    desktopTable,
    mobileCard,
    loading = false,
    emptyMessage = 'لا توجد بيانات'
}: ResponsiveTableProps<T>) {
    const isMobile = useMediaQuery('(max-width: 1024px)');

    if (loading) {
        return <div className="text-center py-12">جاري التحميل...</div>;
    }

    if (data.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>;
    }

    if (isMobile) {
        return (
            <div className="space-y-3">
                {data.map((item, index) => (
                    <Card key={index} className="border">
                        <CardContent className="p-4">
                            {mobileCard(item, index)}
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            {desktopTable}
        </div>
    );
}

/**
 * Simple Responsive Table with overflow scroll
 * Use when mobile cards are not needed
 */
export function ScrollableTable({ children, minWidth = '800px' }: { children: React.ReactNode; minWidth?: string }) {
    return (
        <div className="overflow-x-auto">
            <div style={{ minWidth }}>
                {children}
            </div>
        </div>
    );
}

export default ResponsiveTable;
