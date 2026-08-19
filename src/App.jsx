import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AmbientBackground from './components/layout/AmbientBackground';
import { SyllabusProvider } from './context/SyllabusContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TeacherStudio from './pages/TeacherStudio';
import StudentPortal from './pages/StudentPortal';

export default function App() {
  return (
    <AuthProvider>
      <SyllabusProvider>
        <AmbientBackground />
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/principal"
              element={
                <ProtectedRoute allowedRole="principal">
                  <PrincipalDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherStudio />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentPortal />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </HashRouter>
      </SyllabusProvider>
    </AuthProvider>
  );
}
