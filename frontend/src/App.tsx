import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { UsersPage } from './pages/dashboard/UsersPage';
import { CreatorDetailPage } from './pages/dashboard/CreatorDetailPage';
import { ReelsPage } from './pages/dashboard/ReelsPage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';
import { RolesPage } from './pages/dashboard/RolesPage';
import { ActivityLogsPage } from './pages/dashboard/ActivityLogsPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Admin & Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverviewPage />} />
            <Route path="reels" element={<ReelsPage />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requireAdmin>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <CreatorDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="activity" element={<ActivityLogsPage />} />
            <Route
              path="roles"
              element={
                <ProtectedRoute requireAdmin>
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
