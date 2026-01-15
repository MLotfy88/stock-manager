
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowRight, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { InventoryItem, Supplier } from '@/types';
import { differenceInDays, parseISO, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getSuppliers } from '@/data/operations/supplierOperations';

interface RiskItem extends InventoryItem {
    daysUntilReturnDeadline: number;
    returnPeriod: number;
}

export const SupplierRiskWidget = () => {
    const { t } = useLanguage();
    const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRiskData = async () => {
            try {
                const [inventory, suppliers] = await Promise.all([
                    getInventoryItems(),
                    getSuppliers()
                ]);

                const supplierMap = new Map<string, Supplier>();
                suppliers.forEach(s => supplierMap.set(s.id, s));

                const today = new Date();

                const risks: RiskItem[] = [];

                inventory.forEach(item => {
                    if (!item.supplier_id || item.quantity === 0) return;

                    const supplier = supplierMap.get(item.supplier_id);
                    // Default to 30 days if not set, or use the supplier's specific return period if available in type
                    // The current Supplier type has alert_period, assuming that maps to return policy for now
                    // or we use the recently added field return_period_days if strictly typed (checked types/index.ts usually has it)
                    const returnPeriod = supplier?.alert_period || 30;

                    const expiryDate = parseISO(item.expiry_date);

                    if (!isAfter(expiryDate, today)) return; // Already expired

                    const daysUntilExpiry = differenceInDays(expiryDate, today);

                    // Logic: "Risk" if we are approaching the return deadline.
                    // Return Deadline = ExpiryDate - ReturnPeriod
                    // We are at risk if Today is close to (Expiry - ReturnPeriod)
                    // i.e., DaysUntilExpiry is close to ReturnPeriod.

                    // Let's say we want to alert items where we have less than 2 weeks left to return.
                    // DaysRemainingToReturn = DaysUntilExpiry - ReturnPeriod

                    const daysRemainingToReturn = daysUntilExpiry - returnPeriod;

                    if (daysRemainingToReturn <= 14 && daysRemainingToReturn >= 0) {
                        risks.push({
                            ...item,
                            daysUntilReturnDeadline: daysRemainingToReturn,
                            returnPeriod
                        });
                    }
                });

                // Sort by most urgent (least days remaining to return)
                risks.sort((a, b) => a.daysUntilReturnDeadline - b.daysUntilReturnDeadline);

                setRiskItems(risks.slice(0, 5)); // Top 5 risks
            } catch (error) {
                console.error("Failed to load supplier risk data", error);
            } finally {
                setLoading(false);
            }
        };

        loadRiskData();
    }, []);

    if (loading) return <div className="h-40 rounded-xl bg-muted/20 animate-pulse" />;

    if (riskItems.length === 0) return null; // Don't show if no risks

    return (
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            {t('supplier_return_risk') || 'Supplier Return Risks'}
                        </CardTitle>
                        <CardDescription>
                            {t('items_nearing_return_deadline') || 'Items approaching supplier return deadline'}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {riskItems.length} {t('items') || 'Items'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {riskItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                            <div>
                                <div className="font-medium">{item.product_name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {item.supplier_name} • {item.variant}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-orange-600">
                                    {item.daysUntilReturnDeadline} {t('days_left') || 'days left'}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    to return
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button variant="ghost" className="w-full text-xs h-8 mt-2" asChild>
                        <Link to="/reports">
                            {t('view_all_risks') || 'View All Risks'} <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
