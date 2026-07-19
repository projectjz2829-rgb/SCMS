import React, { JSX, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const Login = lazy(() => import('./components/Login'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Students = lazy(() => import('./components/Students'));
const FacultyPage = lazy(() => import('./components/Faculty'));
const Courses = lazy(() => import('./components/Courses'));
const Announcements = lazy(() => import('./components/Announcements'));
const Activity = lazy(() => import('./components/Activity'));
const FacultyDashboard = lazy(() => import('./components/FacultyDashboard'));
const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const Attendance = lazy(() => import('./components/Attendance'));
const Marks = lazy(() => import('./components/Marks'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));

const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element, allowedRoles?: string[] }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { role } = useAuth();
  if (role === 'admin') return <Navigate to="/dashboard" replace />;
  if (role === 'faculty') return <Navigate to="/faculty-dashboard" replace />;
  if (role === 'student') return <Navigate to="/student-dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400">Loading Application...</div>}>
              <Routes>
                <Route path="/login" element={<Login onLogin={() => {}} />} />
                
                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<RootRedirect />} />
                  <Route path="dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
                  <Route path="faculty-dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
                  <Route path="student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
                  
                  <Route path="students" element={<ProtectedRoute allowedRoles={['admin', 'faculty']}><Students /></ProtectedRoute>} />
                  <Route path="faculty" element={<ProtectedRoute allowedRoles={['admin']}><FacultyPage /></ProtectedRoute>} />
                  <Route path="courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
                  <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
                  <Route path="marks" element={<ProtectedRoute><Marks /></ProtectedRoute>} />
                  <Route path="announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
                  <Route path="activity" element={<ProtectedRoute allowedRoles={['admin']}><Activity /></ProtectedRoute>} />
                  
                  <Route path="profile" element={<ProtectedRoute><Profile role="student" /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
