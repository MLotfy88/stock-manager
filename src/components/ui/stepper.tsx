import React from 'react';
import { cn } from '@/lib/utils';

interface StepperProps {
  activeStep: number;
  children: React.ReactNode;
  className?: string;
}

export const Stepper = ({ activeStep, children, className }: StepperProps) => {
  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive: index === activeStep,
            isCompleted: index < activeStep,
            isLast: index === React.Children.count(children) - 1,
          });
        }
        return child;
      })}
    </div>
  );
};

interface StepProps {
  isActive?: boolean;
  isCompleted?: boolean;
  isLast?: boolean;
  children: React.ReactNode;
}

export const Step = ({ isActive, isCompleted, isLast, children }: StepProps) => {
  return (
    <div className="flex items-center w-full">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white",
            isCompleted ? "bg-blue-600" : isActive ? "bg-blue-500" : "bg-gray-300"
          )}
        >
          {isCompleted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : null}
        </div>
      </div>
      {!isLast && (
        <div
          className={cn(
            "flex-auto border-t-2 transition-colors duration-500",
            isCompleted ? "border-blue-600" : "border-gray-300"
          )}
        />
      )}
    </div>
  );
};

interface StepLabelProps {
  children: React.ReactNode;
}

export const StepLabel = ({ children }: StepLabelProps) => {
  return (
    <div className="text-center mt-2 text-sm text-gray-600">{children}</div>
  );
};
