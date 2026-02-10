import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, MessageSquare, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import { NotificationBadge } from '@/components/notifications/NotificationBadge';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

 return (
  <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center space-x-2">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <Home className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl">Fofa House</span>
      </Link>

      <nav className="hidden md:flex items-center space-x-6">
        <Link to="/search" className="text-sm font-medium hover:text-primary transition-colors">
          Procurar
        </Link>
        <Link to="/map" className="text-sm font-medium hover:text-primary transition-colors">
          Mapa
        </Link>
        {user && (
          <>
            <Link to="/favorites" className="text-sm font-medium hover:text-primary transition-colors">
              Favoritos
            </Link>
            {/* NOTIFICAÇÃO DESKTOP */}
            <Link to="/messages" className="relative text-sm font-medium hover:text-primary transition-colors">
              Mensagens
              <NotificationBadge /> 
            </Link>
          </>
        )}
      </nav>

      <div className="flex items-center space-x-3">
        {user ? (
          <>
            <Button asChild variant="default" className="hidden sm:flex">
              <Link to="/dashboard">Publicar Imóvel</Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                  <User className="w-5 h-5" />
                  {/* Badge discreto no ícone de perfil também ajuda */}
                  <NotificationBadge />
                </Button>
              </DropdownMenuTrigger>
              {/* ... resto do seu DropdownMenuContent ... */}
            </DropdownMenu>
          </>
        ) : (
          <Button asChild variant="default">
            <Link to="/auth">Entrar / Registrar</Link>
          </Button>
        )}
      </div>
    </div>

    {/* MOBILE NAVIGATION - OTIMIZADA */}
    {user && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="grid grid-cols-5 gap-1 p-2"> {/* Mudei para 5 colunas para caber as mensagens */}
          <Link to="/" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
            <Home className="w-5 h-5 mb-1" />
            Início
          </Link>
          <Link to="/search" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
            <Search className="w-5 h-5 mb-1" />
            Procurar
          </Link>
          {/* NOTIFICAÇÃO MOBILE */}
          <Link to="/messages" className="relative flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
            <MessageSquare className="w-5 h-5 mb-1" />
            <NotificationBadge />
            Mensagens
          </Link>
          <Link to="/favorites" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
            <Heart className="w-5 h-5 mb-1" />
            Favoritos
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
            <LayoutDashboard className="w-5 h-5 mb-1" />
            Painel
          </Link>
        </div>
      </div>
    )}
  </header>
);
}
