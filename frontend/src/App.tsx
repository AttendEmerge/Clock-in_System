import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Auth
import LoginPage from './pages/auth/LoginPage';
import MobileClockInPage from './pages/MobileClockInPage';

// Employee
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeHistoryPage from './pages/employee/EmployeeHistoryPage';
import EmployeeOvertimePage from './pages/employee/EmployeeOvertimePage';
import EmployeeLeavePage from './pages/employee/EmployeeLeavePage';

// Supervisor
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import SupervisorOvertimePage from './pages/supervisor/SupervisorOvertimePage';

// HR
import HRDashboard from './pages/hr/HRDashboard';
import HROvertimePage from './pages/hr/HROvertimePage';
import HRLeaveReportPage from './pages/hr/HRLeaveReportPage';
import HRWorkforceHubPage from './pages/hr/HRWorkforceHubPage';
import HRAttendanceHubPage from './pages/hr/HRAttendanceHubPage';
import HRLeaveHubPage from './pages/hr/HRLeaveHubPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mobile" element={<MobileClockInPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Employee routes */}
          <Route path="/employee/dashboard" element={
            <ProtectedRoute allowedRoles={['employee', 'supervisor', 'hr']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          } />
          <Route path="/employee/history" element={
            <ProtectedRoute allowedRoles={['employee', 'supervisor', 'hr']}>
              <EmployeeHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/employee/overtime" element={
            <ProtectedRoute allowedRoles={['employee', 'supervisor', 'hr']}>
              <EmployeeOvertimePage />
            </ProtectedRoute>
          } />
          <Route path="/employee/leave" element={
            <ProtectedRoute allowedRoles={['employee', 'supervisor', 'hr']}>
              <EmployeeLeavePage />
            </ProtectedRoute>
          } />

          {/* Supervisor routes */}
          <Route path="/supervisor/dashboard" element={
            <ProtectedRoute allowedRoles={['supervisor', 'hr']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/supervisor/team" element={
            <ProtectedRoute allowedRoles={['supervisor', 'hr']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/supervisor/overtime" element={
            <ProtectedRoute allowedRoles={['supervisor', 'hr']}>
              <SupervisorOvertimePage />
            </ProtectedRoute>
          } />

          {/* HR routes */}
          <Route path="/hr/dashboard" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRDashboard />
            </ProtectedRoute>
          } />
          <Route path="/hr/workforce" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRWorkforceHubPage />
            </ProtectedRoute>
          } />
          <Route path="/hr/attendance" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRAttendanceHubPage />
            </ProtectedRoute>
          } />
          <Route path="/hr/overtime" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HROvertimePage />
            </ProtectedRoute>
          } />
          <Route path="/hr/leave" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRLeaveHubPage />
            </ProtectedRoute>
          } />
          <Route path="/hr/reports" element={
            <ProtectedRoute allowedRoles={['hr']}>
              <HRLeaveReportPage />
            </ProtectedRoute>
          } />

          {/* Legacy HR route redirects */}
          <Route path="/hr/employees" element={<Navigate to="/hr/workforce" replace />} />
          <Route path="/hr/departments" element={<Navigate to="/hr/workforce?tab=departments" replace />} />
          <Route path="/hr/clock-history" element={<Navigate to="/hr/attendance" replace />} />
          <Route path="/hr/flags" element={<Navigate to="/hr/attendance?tab=flags" replace />} />
          <Route path="/hr/locations" element={<Navigate to="/hr/attendance?tab=locations" replace />} />
          <Route path="/hr/tokens" element={<Navigate to="/hr/attendance?tab=tokens" replace />} />
          <Route path="/hr/leave-policy" element={<Navigate to="/hr/leave?tab=policy" replace />} />
          <Route path="/hr/holidays" element={<Navigate to="/hr/leave?tab=holidays" replace />} />
          <Route path="/hr/schedule" element={<Navigate to="/hr/leave?tab=schedule" replace />} />
          <Route path="/hr/leave-report" element={<Navigate to="/hr/reports?tab=leave" replace />} />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
                <a href="/login" className="text-blue-600 hover:underline mt-4 block">Back to Login</a>
              </div>
            </div>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
