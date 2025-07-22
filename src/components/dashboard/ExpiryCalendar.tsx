
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
  
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long' });
  
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
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{t('expiry_calendar')}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={direction === 'rtl' ? goToNextMonth : goToPreviousMonth}>
              {direction === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={direction === 'rtl' ? goToPreviousMonth : goToNextMonth}>
              {direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="text-muted-foreground text-sm mt-1">
          {language === 'ar' ? `${monthName} ${currentYear}` : `${monthName} ${currentYear}`}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isToday = day === currentDate.getDate() && 
                          currentMonth === currentDate.getMonth() && 
                          currentYear === currentDate.getFullYear();
            const hasExpiry = !!expiryDates[day];
            const itemCount = hasExpiry ? expiryDates[day].length : 0;
            
            return (
              <div 
                key={`day-${day}`} 
                className={`h-12 p-1 rounded-md relative text-center transition-all duration-200 ${
                  isToday ? 'bg-primary/10 font-bold' : 
                  hasExpiry ? 'bg-amber-50 hover:bg-amber-100' : 
                  'hover:bg-gray-50'
                }`}
              >
                <div className="text-xs">{day}</div>
                {hasExpiry && (
                  <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                    <div className={`text-xs px-1 rounded-full font-medium ${
                      itemCount > 2 ? 'bg-destructive text-white' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {itemCount}
                    </div>
                  </div>
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
