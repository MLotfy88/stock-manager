import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScanBarcode, Trash2, Copy } from 'lucide-react';

interface MobileSupplyItemCardProps {
  itemId: string;
  children: React.ReactNode;
  onScan: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onDuplicate?: (itemId: string) => void;
  canRemove: boolean;
}

export const MobileSupplyItemCard: React.FC<MobileSupplyItemCardProps> = ({
  itemId,
  children,
  onScan,
  onRemove,
  onDuplicate,
  canRemove,
}) => {
  return (
    <Card className="md:hidden mb-4 border-primary/20">
      <CardContent className="p-4 space-y-4">
        {children}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-dashed">
          <Button type="button" size="icon" variant="ghost" onClick={() => onScan(itemId)}>
            <ScanBarcode className="h-5 w-5 text-primary" />
          </Button>
          {onDuplicate && (
            <Button type="button" size="icon" variant="ghost" onClick={() => onDuplicate(itemId)}>
              <Copy className="h-5 w-5 text-blue-500" />
            </Button>
          )}
          <Button type="button" size="icon" variant="ghost" onClick={() => onRemove(itemId)} disabled={!canRemove}>
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
