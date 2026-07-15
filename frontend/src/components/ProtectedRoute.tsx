import { Navigate } from 'react-router-dom';

// Redirects unauthenticated users to /login
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
