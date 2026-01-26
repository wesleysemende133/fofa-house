import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HomePage from '@/pages/HomePage';
import SearchPage from '@/pages/SearchPage';
import PropertyDetailPage from '@/pages/PropertyDetailPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import FavoritesPage from '@/pages/FavoritesPage';
import MessagesPage from '@/pages/MessagesPage';
import AuthPage from '@/pages/AuthPage';
import MapViewPage from '@/pages/MapViewPage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/property/:id" element={<PropertyDetailPage />} />
      <Route path="/map" element={<MapViewPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Substitua pelo seu email real entre as aspas
  const isAdminEmail = user?.email === 'seu-email-aqui@gmail.com';

  if (!user || (!isAdminEmail && user.role !== 'admin')) {
    console.log("Acesso negado para:", user?.email, "Role:", user?.role);
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default App;
