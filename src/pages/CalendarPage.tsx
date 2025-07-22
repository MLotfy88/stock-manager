
import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Package, CheckCircle
} from 'lucide-react';
import { InventoryItem, ProductDefinition } from '@/types';
import { format } from 'date-fns';
import { getInventoryItems } from '@/data/operations/suppliesOperations';
import { getProductDefinitions } from '@/data/operations/productDefinitionOperations';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

// Helper function to classify expiry status
const getExpiryStatus = (date: Date) => {
  const today = new Date();
  const timeDiff = date.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining < 30) return 'critical';
  if (daysRemaining < 90) return 'warning';
  return 'ok';
};

const CalendarPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { t, direction, language } = useLanguage();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productDefs, setProductDefs] = useState<ProductDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [inventoryData, defsData] = await Promise.all([
          getInventoryItems(),
          getProductDefinitions(),
        ]);
        setInventory(inventoryData);
        setProductDefs(defsData);
      } catch (error) {
        console.error("Failed to fetch calendar data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Get the number of days in the current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get the first day of the month (0-6, where 0 is Sunday)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  // Adjust first day for Arabic calendar (starts with Saturday)
  const adjustedFirstDay = direction === 'rtl' ? firstDayOfMonth : (firstDayOfMonth + 1) % 7;
  
  // Get the month name
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-US', 
    { month: 'long' }
  );
  
  // Group supplies by expiry date
  const expiryDateMap: Record<string, InventoryItem[]> = {};
  
  inventory.forEach((item) => {
    const expiryDate = new Date(item.expiry_date);
    const dateKey = expiryDate.toISOString().split('T')[0];
    
    // Only include dates in the current month and year
    if (expiryDate.getMonth() === currentMonth && expiryDate.getFullYear() === currentYear) {
      if (!expiryDateMap[dateKey]) {
        expiryDateMap[dateKey] = [];
      }
      expiryDateMap[dateKey].push(item);
    }
  });
  
  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };
  
  // Handle day click
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
  };
  
  // Get supplies for the selected date
  const getSuppliesForSelectedDate = () => {
    if (!selectedDate) return [];
    
    const dateKey = selectedDate.toISOString().split('T')[0];
    return expiryDateMap[dateKey] || [];
  };
  
  // Days of the week
  const weekDays = [
    t('saturday'), t('sunday'), t('monday'), t('tuesday'), 
    t('wednesday'), t('thursday'), t('friday')
  ];
  
  // Calendar grid cells
  const calendarCells = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="h-24 p-1 bg-gray-50 border border-gray-100"></div>);
  }
  
  // Add cells for each day in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateKey = date.toISOString().split('T')[0];
    const hasExpiries = !!expiryDateMap[dateKey];
    const suppliesForDay = expiryDateMap[dateKey] || [];
    
    // Determine if it's today
    const isToday = day === currentDate.getDate() && 
                    currentMonth === currentDate.getMonth() && 
                    currentYear === currentDate.getFullYear();
    
    // Determine if it's selected
    const isSelected = selectedDate && day === selectedDate.getDate() && 
                     currentMonth === selectedDate.getMonth() && 
                     currentYear === selectedDate.getFullYear();
    
    // Find the most critical status for the day
    let mostCriticalStatus = 'ok';
    if (hasExpiries) {
      suppliesForDay.forEach((item) => {
        const expiryDate = new Date(item.expiry_date);
        const status = getExpiryStatus(expiryDate);
        if (status === 'expired' && mostCriticalStatus !== 'expired') {
          mostCriticalStatus = 'expired';
        } else if (status === 'critical' && mostCriticalStatus !== 'expired' && mostCriticalStatus !== 'critical') {
          mostCriticalStatus = 'critical';
        } else if (status === 'warning' && mostCriticalStatus !== 'expired' && mostCriticalStatus !== 'critical' && mostCriticalStatus !== 'warning') {
          mostCriticalStatus = 'warning';
        }
      });
    }
    
    const cellClasses = cn({
      "h-24 p-2 border border-gray-200 transition-colors": true,
      "bg-primary/10 border-primary": isToday && !isSelected,
      "bg-secondary/10 border-secondary font-bold": isSelected,
      "bg-red-50 border-red-200": !isSelected && !isToday && mostCriticalStatus === 'expired',
      "bg-amber-50 border-amber-200": !isSelected && !isToday && mostCriticalStatus === 'critical',
      "bg-yellow-50 border-yellow-200": !isSelected && !isToday && mostCriticalStatus === 'warning',
      "hover:bg-gray-50": !isSelected && !isToday && mostCriticalStatus === 'ok'
    });
    
    calendarCells.push(
      <div 
        key={`day-${day}`} 
        className={cellClasses}
        onClick={() => handleDayClick(day)}
      >
        <div className="flex justify-between">
          <span className={isToday ? "font-bold" : ""}>{day}</span>
          {hasExpiries && (
            <Badge 
              variant={
                mostCriticalStatus === 'expired' ? 'destructive' : 
                mostCriticalStatus === 'critical' ? 'outline' : 
                mostCriticalStatus === 'warning' ? 'outline' : 'outline'
              }
              className={
                mostCriticalStatus === 'critical' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 
                mostCriticalStatus === 'warning' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : ''
              }
            >
              {suppliesForDay.length}
            </Badge>
          )}
        </div>
        
        {/* Show up to 2 expiring items */}
        {hasExpiries && suppliesForDay.slice(0, 2).map((item, index) => {
          const def = productDefs.find(d => d.id === item.product_definition_id);
          return (
            <div 
              key={item.id} 
              className="text-xs truncate mt-1 p-1 rounded bg-white/80"
              title={def?.name || ''}
            >
              {def?.name || 'N/A'}
            </div>
          );
        })}
        
        {/* Show count of remaining items if more than 2 */}
        {hasExpiries && suppliesForDay.length > 2 && (
          <div className="text-xs text-muted-foreground mt-1">
            +{suppliesForDay.length - 2} {t('more')}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={direction}>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      
      <main className={`pt-20 ${isMobile ? 'px-4' : direction === 'rtl' ? 'pr-72 pl-8' : 'pl-72 pr-8'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('calendar_nav')}</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {t('calendar_overview')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={direction === 'rtl' ? goToNextMonth : goToPreviousMonth}>
                {direction === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              
              <div className="text-lg font-medium">
                {language === 'ar' ? `${monthName} ${currentYear}` : `${monthName} ${currentYear}`}
              </div>
              
              <Button variant="outline" size="sm" onClick={direction === 'rtl' ? goToPreviousMonth : goToNextMonth}>
                {direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setCurrentMonth(currentDate.getMonth());
                  setCurrentYear(currentDate.getFullYear());
                  setSelectedDate(null);
                }}
              >
                {t('today')}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="col-span-3 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>{t('expiry_calendar')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Days of Week Headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((day) => (
                    <div 
                      key={day} 
                      className="text-center font-medium py-2 bg-gray-100 rounded"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells}
                </div>
                
                {/* Calendar Legend */}
                <div className="flex flex-wrap gap-4 mt-4 justify-end">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                    <span className="text-xs text-muted-foreground">{t('expired')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
                    <span className="text-xs text-muted-foreground">{t('critical')} (&lt;30 {t('days')})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                    <span className="text-xs text-muted-foreground">{t('warning')} (&lt;90 {t('days')})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-primary/10 border border-primary/20 rounded"></div>
                    <span className="text-xs text-muted-foreground">{t('today')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-3 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle>
                  {selectedDate ? format(selectedDate, 'PPP') : t('selected_date')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <>
                    {getSuppliesForSelectedDate().length > 0 ? (
                      <div className="space-y-4">
                        {getSuppliesForSelectedDate().map((item) => {
                          const expiryDate = new Date(item.expiry_date);
                          const status = getExpiryStatus(expiryDate);
                          const def = productDefs.find(d => d.id === item.product_definition_id);
                          
                          return (
                            <div 
                              key={item.id} 
                              className={cn({
                                "p-3 rounded-md border": true,
                                "bg-red-50 border-red-200": status === 'expired',
                                "bg-amber-50 border-amber-200": status === 'critical',
                                "bg-yellow-50 border-yellow-200": status === 'warning',
                                "bg-gray-50 border-gray-200": status === 'ok'
                              })}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{def?.name || 'N/A'}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('batch')}: {item.batch_number}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('variant')}: {item.variant}
                                  </p>
                                </div>
                                {status === 'expired' ? (
                                  <Badge variant="destructive">{t('expired_status')}</Badge>
                                ) : status === 'critical' ? (
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                    {t('expiring_soon_status')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                                    {t('valid')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-1">{t('no_expiries')}</h3>
                        <p className="text-sm text-muted-foreground">{t('no_expiries_on_date')}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">{t('no_date_selected')}</h3>
                    <p className="text-sm text-muted-foreground">{t('click_on_date')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
