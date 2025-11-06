
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InventoryItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { getInventoryItems } from '@/data/operations/suppliesOperations';

const ExpiryCalendar = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const inventoryData = await getInventoryItems();
        setInventory(inventoryData);
      } catch (error) {
        console.error("Failed to fetch expiry calendar data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = React.useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = React.useState(currentDate.getFullYear());
  const { t, language, direction } = useLanguage();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  // Adjust the first day to match calendar (week starts on Saturday)
  const adjustedFirstDay = (firstDayOfMonth + 1) % 7;
  
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
  
  // Create days for display
  const days = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-12 p-1"></div>);
  }
  
  // Get expiry dates for current month
  const expiryDates = inventory.reduce((acc, item) => {
    const expiryDate = new Date(item.expiry_date);
    if (expiryDate.getMonth() === currentMonth && expiryDate.getFullYear() === currentYear) {
      const day = expiryDate.getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
    }
    return acc;
  }, {} as Record<number, InventoryItem[]>);
  
  // Next and previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const weekdays = language === 'ar' 
    ? [t('saturday'), t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday')]
    : [t('saturday'), t('sunday'), t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday')];
  
  return (
    <Card className="hover-lift h-full">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{t('expiry_calendar')}</CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={direction === 'rtl' ? goToNextMonth : goToPreviousMonth}>
            {direction === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={direction === 'rtl' ? goToPreviousMonth : goToNextMonth}>
            {direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-2">
        <div className="text-center text-sm font-medium mb-2">
          {`${monthName} ${currentYear}`}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          {weekdays.map((day) => <div key={day}>{day.substring(0, 2)}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for padding */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          
          {/* Calendar days */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isToday = day === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear();
            const hasExpiry = !!expiryDates[day];
            
            return (
              <div 
                key={day} 
                className={`
                  relative w-full aspect-square flex items-center justify-center rounded-full text-xs
                  ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                `}
              >
                {day}
                {hasExpiry && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-background" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpiryCalendar;
