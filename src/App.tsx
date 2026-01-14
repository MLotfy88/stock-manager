import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { usePageTracking } from './hooks/usePageTracking';
import './App.css';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import UserLayout from './components/layout/UserLayout';

// Lazy load pages
const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SuppliesPage = lazy(() => import('./pages/SuppliesPage'));
const AddInventoryPage = lazy(() => import('./pages/AddSupplyPage'));
const TransferInventoryPage = lazy(() => import('./pages/TransferInventoryPage'));
const InventoryReportPage = lazy(() => import('./pages/InventoryReportPage'));
const ConsumptionPage = lazy(() => import('./pages/ConsumptionPage'));
const AllSuppliesPage = lazy(() => import('./pages/AllSuppliesPage'));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));
// Add other admin pages here if needed
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ReorderPointReportPage = lazy(() => import('./pages/ReorderPointReportPage'));
const ConsumptionReportPage = lazy(() => import('./pages/ConsumptionReportPage'));
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const ReplacementVoucherPage = lazy(() => import('./pages/ReplacementVoucherPage'));
const OnShelfReportPage = lazy(() => import('./pages/OnShelfReportPage'));
const OnShelfInvoicingPage = lazy(() => import('./pages/OnShelfInvoicingPage'));
const ProcedureTemplatesPage = lazy(() => import('./pages/ProcedureTemplatesPage'));
const SupplierPerformancePage = lazy(() => import('./pages/SupplierPerformancePage'));
const ReturnsManagementPage = lazy(() => import('./pages/ReturnsManagementPage'));


const PageTracker = () => {
  usePageTracking();
  return null;
};

const AdminLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

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
};

const AppRoutes = () => {
  const { user, session, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const userRole = user?.profile?.role || 'user';

  // Debug logging (remove in production)
  console.log('User role:', userRole, 'Session:', !!session);

  return (
    <Routes>
      {userRole === 'admin' ? (
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/supplies" element={<SuppliesPage />} />
          <Route path="/all-supplies" element={<AllSuppliesPage />} />
          <Route path="/add-supply" element={<AddInventoryPage />} />
          <Route path="/consumption" element={<ConsumptionPage />} />
          <Route path="/transfer-inventory" element={<TransferInventoryPage />} />
          <Route path="/inventory-report" element={<InventoryReportPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reorder-point-report" element={<ReorderPointReportPage />} />
          <Route path="/consumption-report" element={<ConsumptionReportPage />} />
          <Route path="/import-export" element={<ImportExportPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/replacement-voucher" element={<ReplacementVoucherPage />} />
          <Route path="/on-shelf-report" element={<OnShelfReportPage />} />
          <Route path="/on-shelf-invoicing" element={<OnShelfInvoicingPage />} />
          <Route path="/procedure-templates" element={<ProcedureTemplatesPage />} />
          <Route path="/supplier-performance" element={<SupplierPerformancePage />} />
          <Route path="/returns-management" element={<ReturnsManagementPage />} />
        </Route>
      ) : (
        <Route element={<UserLayout />}>
          <Route path="/" element={<UserDashboardPage />} />
          <Route path="/supplies" element={<SuppliesPage />} />
          <Route path="/transfer-inventory" element={<TransferInventoryPage />} />
          <Route path="/consumption" element={<ConsumptionPage />} />
          <Route path="/inventory-report" element={<InventoryReportPage />} />
        </Route>
      )}
      {/* 404 Page - applies to any unmatched route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <PageTracker />
          <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
            <AppRoutes />
          </Suspense>
          <Toaster />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
