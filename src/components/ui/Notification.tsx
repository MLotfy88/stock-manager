
import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationProps {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error';
  autoClose?: boolean;
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  title,
  message,
  type = 'info',
  autoClose = true,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const { direction } = useLanguage();
  
  useEffect(() => {
    if (autoClose) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 100));
          return newProgress < 0 ? 0 : newProgress;
        });
      }, 100);
      
      const timeout = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => {
        clearInterval(timer);
        clearTimeout(timeout);
      };
    }
  }, [autoClose, duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };
  
  if (!isVisible) return null;
  
  const typeConfig = {
    info: {
      icon: <Bell className="h-5 w-5" />,
      className: 'bg-primary/10 border-primary/20 text-primary'
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5" />,
      className: 'bg-amber-50 border-amber-200 text-amber-700'
    },
    error: {
      icon: <AlertTriangle className="h-5 w-5" />,
      className: 'bg-destructive/10 border-destructive/20 text-destructive'
    }
  };
  
  const config = typeConfig[type];
  
  return (
    <div className={cn(
      "fixed top-20 p-4 rounded-lg shadow-md border",
      "w-80 z-50 animate-slide-in-right",
      direction === 'rtl' ? "right-4 md:right-6" : "left-4 md:left-6",
      config.className
    )}>
      <div className="flex justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5">{config.icon}</div>
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-sm mt-1">{message}</p>
          </div>
        </div>
        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {autoClose && (
        <div className="h-1 w-full bg-black/10 rounded-full mt-3 overflow-hidden">
          <div 
            className="h-full bg-white/30 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default Notification;
