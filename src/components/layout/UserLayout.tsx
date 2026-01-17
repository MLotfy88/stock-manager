import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomGlassNav from './BottomGlassNav';
import { useMediaQuery } from '@/hooks/use-mobile';

const UserLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      closeSidebar();
    }
  }, [isMobile]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        closeSidebar={closeSidebar}
      />
      <div className="flex flex-col flex-1">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 p-4 overflow-auto pb-24 md:pb-4 pt-16">
          <Outlet />
        </main>
        <BottomGlassNav onMenuClick={toggleSidebar} />
      </div>
    </div>
  );
};

export default UserLayout;

