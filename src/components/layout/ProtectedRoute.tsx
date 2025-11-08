import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const userAllowedPaths = [
  '/user-dashboard',
  '/supplies',
  '/transfer-inventory',
  '/consumption',
  '/inventory-report',
];

const ProtectedRoute = () => {
  const { session, user, isLoading } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.app_metadata?.userrole || 'user';

  if (userRole === 'admin') {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
        />
        <div className="flex flex-col flex-1">
          <Header toggleSidebar={toggleSidebar} />
          <main className="flex-1 p-4 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  if (userRole === 'user') {
    if (userAllowedPaths.includes(location.pathname)) {
      // For the user dashboard, we don't show a sidebar.
      if (location.pathname === '/user-dashboard') {
        return <Outlet />;
      }
      // For other allowed paths, you might want a simpler layout or none at all
      // Depending on whether they should be standalone pages.
      // For now, let's just render them.
      return <Outlet />;
    } else {
      return <Navigate to="/user-dashboard" replace />;
    }
  }

  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
