import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { usePageTracking } from './hooks/usePageTracking';
import './App.css';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Lazy load pages
const Index = lazy(() => import('./pages/Index'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SuppliesPage = lazy(() => import('./pages/SuppliesPage'));
const AddInventoryPage = lazy(() => import('./pages/AddSupplyPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const TransferInventoryPage = lazy(() => import('./pages/TransferInventoryPage'));
const InventoryReportPage = lazy(() => import('./pages/InventoryReportPage'));
const ReorderPointReportPage = lazy(() => import('./pages/ReorderPointReportPage'));
const ConsumptionReportPage = lazy(() => import('./pages/ConsumptionReportPage'));
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'));
const ConsumptionPage = lazy(() => import('./pages/ConsumptionPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const AllSuppliesPage = lazy(() => import('./pages/AllSuppliesPage'));
const ReplacementVoucherPage = lazy(() => import('./pages/ReplacementVoucherPage'));
const OnShelfReportPage = lazy(() => import('./pages/OnShelfReportPage'));
const OnShelfInvoicingPage = lazy(() => import('./pages/OnShelfInvoicingPage'));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));

const PageTracker = () => {
  usePageTracking();
  return null;
};

function App() {
  return (
    <LanguageProvider>
      <Router>
        <PageTracker />
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/supplies" element={<SuppliesPage />} />
              <Route path="/all-supplies" element={<AllSuppliesPage />} />
              <Route path="/add-supply" element={<AddInventoryPage />} />
              <Route path="/consumption" element={<ConsumptionPage />} />
              <Route path="/replacement-voucher" element={<ReplacementVoucherPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/inventory-report" element={<InventoryReportPage />} />
              <Route path="/reorder-point-report" element={<ReorderPointReportPage />} />
              <Route path="/consumption-report" element={<ConsumptionReportPage />} />
              <Route path="/on-shelf-report" element={<OnShelfReportPage />} />
              <Route path="/on-shelf-invoicing" element={<OnShelfInvoicingPage />} />
              <Route path="/transfer-inventory" element={<TransferInventoryPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/management" element={<ManagementPage />} />
              <Route path="/user-dashboard" element={<UserDashboardPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </LanguageProvider>
  );
}

export default App;
