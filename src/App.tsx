
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from './contexts/LanguageContext';
import AdminPage from './pages/AdminPage';
import SuppliesPage from './pages/SuppliesPage';
import AddInventoryPage from './pages/AddSupplyPage';
import CalendarPage from './pages/CalendarPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import ManufacturersPage from './pages/ManufacturersPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductDefinitionsPage from './pages/SupplyTypesPage';
import StoresPage from './pages/StoresPage';
import TransferInventoryPage from './pages/TransferInventoryPage';
import InventoryReportPage from './pages/InventoryReportPage';
import ReorderPointReportPage from './pages/ReorderPointReportPage';
import ConsumptionReportPage from './pages/ConsumptionReportPage';
import ImportExportPage from './pages/ImportExportPage';
import ConsumptionPage from './pages/ConsumptionPage';
import ManagementPage from './pages/ManagementPage';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/supplies" element={<SuppliesPage />} />
            <Route path="/add-supply" element={<AddInventoryPage />} />
            <Route path="/consumption" element={<ConsumptionPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/inventory-report" element={<InventoryReportPage />} />
            <Route path="/reorder-point-report" element={<ReorderPointReportPage />} />
            <Route path="/consumption-report" element={<ConsumptionReportPage />} />
            <Route path="/manufacturers" element={<ManufacturersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/supply-types" element={<ProductDefinitionsPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/transfer-inventory" element={<TransferInventoryPage />} />
            <Route path="/import-export" element={<ImportExportPage />} />
            <Route path="/management" element={<ManagementPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </LanguageProvider>
  );
}

export default App;
