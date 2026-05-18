import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetForm from './pages/AssetForm';
import Allocation from './pages/Allocation';
import ReturnManagement from './pages/ReturnManagement';
import DamageReport from './pages/DamageReport';
import DamageLog from './pages/DamageLog';
import AllocationHistory from './pages/AllocationHistory';
import Employees from './pages/Employees';
import AssetRequests from './pages/AssetRequests';
import SaaSInventory from './pages/SaaSInventory';
import AssetHistoryReport from './pages/AssetHistoryReport';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<AssetList />} />
        <Route path="/assets/new" element={<AssetForm />} />
        <Route path="/assets/:id/edit" element={<AssetForm />} />
        <Route path="/allocations" element={<Allocation />} />
        <Route path="/allocations/new" element={<Allocation />} />
        <Route path="/returns" element={<ReturnManagement />} />
        <Route path="/damage-reports" element={<DamageLog />} />
        <Route path="/damage-reports/new" element={<DamageReport />} />
        <Route path="/history" element={<AllocationHistory />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/requests" element={<AssetRequests />} />
        <Route path="/saas" element={<SaaSInventory />} />
        <Route path="/reports/asset/:id" element={<AssetHistoryReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
