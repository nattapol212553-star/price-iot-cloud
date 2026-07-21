import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const DatastreamsPage = lazy(() => import('./pages/DatastreamsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DashboardEditPage = lazy(() => import('./pages/DashboardEditPage'));
const DevicePage = lazy(() => import('./pages/DevicePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#121212] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<div className="h-screen bg-[#121212] flex items-center justify-center text-white">Loading...</div>}>
              <LoginPage />
            </Suspense>
          } />
          
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={
              <Suspense fallback={<div className="h-full flex items-center justify-center text-white">Loading...</div>}>
                <HomePage />
              </Suspense>
            } />
            <Route path="project/:projectId" element={<Navigate to="dashboard" replace />} />
            <Route path="project/:projectId/datastreams" element={
              <Suspense fallback={<div className="h-full flex items-center justify-center text-white">Loading...</div>}>
                <DatastreamsPage />
              </Suspense>
            } />
            <Route path="project/:projectId/dashboard" element={
              <Suspense fallback={<div className="h-full flex items-center justify-center text-white">Loading...</div>}>
                <DashboardPage />
              </Suspense>
            } />
            <Route path="project/:projectId/dashboard/edit" element={
              <Suspense fallback={<div className="h-full flex items-center justify-center text-white">Loading...</div>}>
                <DashboardEditPage />
              </Suspense>
            } />
            <Route path="project/:projectId/device" element={
              <Suspense fallback={<div className="h-full flex items-center justify-center text-white">Loading...</div>}>
                <DevicePage />
              </Suspense>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
