
import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/use-mobile"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  defaultCollapsed?: boolean
  position?: "left" | "right"
  collapsedWidth?: number
  width?: number
  onCollapseChange?: (collapsed: boolean) => void
  className?: string
}

export function Sidebar({
  children,
  defaultCollapsed = false,
  position = "left",
  collapsedWidth = 0,
  width = 260,
  onCollapseChange,
  className,
  ...props
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Handle screen size changes
  useEffect(() => {
    if (isMobile && !collapsed) {
      setCollapsed(true)
      onCollapseChange?.(true)
    } else if (!isMobile && collapsed && !defaultCollapsed) {
      setCollapsed(false)
      onCollapseChange?.(false)
    }
  }, [isMobile, collapsed, defaultCollapsed, onCollapseChange])

  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
    onCollapseChange?.(!collapsed)
  }

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 z-40 border-border transition-all duration-300 ease-in-out bg-background print:hidden",
        position === "left" ? "left-0 border-r" : "right-0 border-l",
        className
      )}
      style={{
        width: collapsed ? collapsedWidth : width,
        transform: isMobile && collapsed ? `translateX(${position === "left" ? "-100%" : "100%"})` : "none",
      }}
      {...props}
    >
      {children}
      
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "absolute top-4 rounded-full shadow-md",
          position === "left" 
            ? "right-0 translate-x-1/2" 
            : "left-0 -translate-x-1/2"
        )}
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-4 w-4 transition-transform",
            position === "left"
              ? collapsed ? "rotate-0" : "rotate-180"
              : collapsed ? "rotate-180" : "rotate-0"
          )}
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Button>
    </aside>
  )
}
