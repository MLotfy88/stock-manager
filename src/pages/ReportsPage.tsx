
import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, FileText, BarChart3, BarChart, PieChart, LineChart, FileSpreadsheet } from 'lucide-react';
import { supplies } from '@/data/mockData';
import { SupplyStatus, SupplyType } from '@/types';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { supplyTypeTranslations } from '@/data/mockData';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RePieChart, Pie, Cell } from 'recharts';

const ReportsPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction } = useLanguage();
  
  const [reportType, setReportType] = useState<string>('expiry');
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });
  
  // Count supplies by status
  const validCount = supplies.filter(s => s.status === 'valid').length;
  const expiringCount = supplies.filter(s => s.status === 'expiring_soon').length;
  const expiredCount = supplies.filter(s => s.status === 'expired').length;
  
  // Generate data for bar chart
  const statusData = [
    { name: t('valid'), value: validCount, fill: '#22c55e' },
    { name: t('expiring_soon'), value: expiringCount, fill: '#f97316' },
    { name: t('expired'), value: expiredCount, fill: '#ef4444' },
  ];
  
  // Group supplies by type
  const typeData = Object.entries(supplyTypeTranslations).map(([key, value]) => {
    const count = supplies.filter(s => s.type === key).length;
    return { name: value, value: count };
  });
  
  // Colors for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#DC7633'];
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header />
      <Sidebar />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('reports_nav')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('reports_overview')}
              </p>
            </div>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t('generate_report')}</CardTitle>
              <CardDescription>{t('select_report_options')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="report-type">{t('report_type')}</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_report_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expiry">{t('expiry_report')}</SelectItem>
                      <SelectItem value="inventory">{t('inventory_report')}</SelectItem>
                      <SelectItem value="supplier">{t('supplier_report')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('date_range')}</Label>
                  <div className="grid gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date?.from ? (
                            date.to ? (
                              <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(date.from, "LLL dd, y")
                            )
                          ) : (
                            <span>{t('pick_a_date')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={date?.from}
                          selected={date}
                          onSelect={setDate}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex items-end gap-2">
                  <Button className="gap-2 flex-1">
                    <FileText className="h-4 w-4" />
                    {t('generate_report')}
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-6 justify-end">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  {t('export_as_pdf')}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {t('export_as_csv')}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="charts" className="mb-8">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="charts" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                {t('charts')}
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('data')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="charts">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('supplies_by_status')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={statusData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#8884d8" name={t('supplies')} />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('supplies_by_type')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {typeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>{t('report_data')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('name')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('type')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('batch_number')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('manufacturer')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('expiry_date')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('status')}</th>
                            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{t('quantity')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {supplies.slice(0, 5).map((supply) => (
                            <tr key={supply.id} className="hover:bg-gray-50">
                              <td className="whitespace-nowrap px-4 py-3">{supply.name}</td>
                              <td className="whitespace-nowrap px-4 py-3">{supplyTypeTranslations[supply.type] || supply.type}</td>
                              <td className="whitespace-nowrap px-4 py-3">{supply.batchNumber}</td>
                              <td className="whitespace-nowrap px-4 py-3">{supply.manufacturerName}</td>
                              <td className="whitespace-nowrap px-4 py-3">{new Date(supply.expiryDate).toLocaleDateString()}</td>
                              <td className="whitespace-nowrap px-4 py-3">
                                <Badge 
                                  variant={supply.status === 'valid' ? 'outline' : 
                                        supply.status === 'expiring_soon' ? 'outline' : 'destructive'}
                                  className={supply.status === 'valid' ? 'bg-green-50 text-green-700 hover:bg-green-50' : 
                                        supply.status === 'expiring_soon' ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : ''}
                                >
                                  {t(`${supply.status}_status`)}
                                </Badge>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">{supply.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
