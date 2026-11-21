import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { ServiceProvider } from './context/ServiceContext';
import { PortalHub } from './pages/PortalHub';
import { AuthPage } from './pages/AuthPage';
import { DealershipLayout } from './layouts/DealershipLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminDashboardPage } from './pages/dealership/AdminDashboardPage';
import { AdvisorDashboardPage } from './pages/dealership/AdvisorDashboardPage';
import { TechnicianWorkspacePage } from './pages/dealership/TechnicianWorkspacePage';
import { EmployeesPage } from './pages/dealership/EmployeesPage';
import { CustomersVehiclesPage } from './pages/dealership/CustomersVehiclesPage';
import { ServiceOrdersPage } from './pages/dealership/ServiceOrdersPage';
import { AppointmentsPage } from './pages/dealership/AppointmentsPage';
import { ApprovalsPage } from './pages/dealership/ApprovalsPage';
import { PartsExchangePage } from './pages/dealership/PartsExchangePage';
import { NotificationsPage } from './pages/dealership/NotificationsPage';
import { ReportsPage } from './pages/dealership/ReportsPage';
import { SettingsPage } from './pages/dealership/SettingsPage';
import { CustomerTrackingPage } from './pages/customer/CustomerTrackingPage';
import { CustomerVehiclesHistoryPage } from './pages/customer/CustomerVehiclesHistoryPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';

export default function App() {
  return (
    <ErrorBoundary>
      <ServiceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PortalHub />} />
            <Route path="/dealership/login" element={<AuthPage mode="dealership-login" />} />
            <Route path="/customer/login" element={<AuthPage mode="customer-login" />} />
            <Route path="/customer/register" element={<AuthPage mode="customer-register" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />

            {/* Dealership Portal */}
            <Route path="/dealership" element={<DealershipLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="advisor" element={<AdvisorDashboardPage />} />
              <Route path="technician" element={<TechnicianWorkspacePage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="customers" element={<CustomersVehiclesPage key="customers" defaultTab="customers" />} />
              <Route path="vehicles" element={<CustomersVehiclesPage key="vehicles" defaultTab="vehicles" />} />
              <Route path="service-orders" element={<ServiceOrdersPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="parts-exchange" element={<PartsExchangePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Customer Portal */}
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<Navigate to="tracking" replace />} />
              <Route path="tracking" element={<CustomerTrackingPage />} />
              <Route path="vehicles" element={<CustomerVehiclesHistoryPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ServiceProvider>
    </ErrorBoundary>
  );
}
