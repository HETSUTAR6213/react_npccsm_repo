import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRole, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Verifying session permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location, message: 'Please log in to access this portal.' }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          error: `Permission Denied: Your account role is '${user.role}', but '${allowedRole}' access is required.`,
        }}
        replace
      />
    );
  }

  return children;
}
