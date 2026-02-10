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
    <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
      {/* Logo: shrink-0 impede que o nome seja esmagado */}
      <Link to="/" className="flex items-center space-x-2 shrink-0">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <Home className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-lg sm:text-xl">Fofa House</span>
      </Link>

      {/* Navigation Desktop */}
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
            <Link to="/messages" className="relative text-sm font-medium hover:text-primary transition-colors">
              Mensagens
              <NotificationBadge />
            </Link>
          </>
        )}
      </nav>

      {/* Right Side: User Menu & Login */}
      <div className="flex items-center space-x-2 shrink-0">
        {user ? (
          <>
            {/* Botão Publicar - Escondido em ecrãs muito pequenos para dar espaço */}
            <Button asChild variant="default" className="hidden sm:flex h-9 px-4">
              <Link to="/dashboard">Publicar</Link>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 relative border border-input">
                  <User className="w-5 h-5 text-foreground" />
                  {/* Badge de notificação no ícone do user para Mobile */}
                  <NotificationBadge />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <div className="px-2 py-1.5 border-b mb-1">
                  <p className="text-sm font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Painel
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/favorites">
                    <Heart className="w-4 h-4 mr-2" /> Favoritos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/messages" className="flex justify-between items-center w-full">
                    <div className="flex items-center">
                       <MessageSquare className="w-4 h-4 mr-2" /> Mensagens
                    </div>
                    {/* Badge simplificado dentro do menu */}
                    <NotificationBadge />
                  </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Shield className="w-4 h-4 mr-2" /> Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          /* Botão de Login visível em todos os tamanhos */
          <Button asChild variant="default" className="h-9 px-4">
            <Link to="/auth">Entrar</Link>
          </Button>
        )}
      </div>
    </div>

{/* Mobile Navigation (Barra Inferior) - FIXA NO FUNDO */}
{user && (
  <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background border-t shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[safe-area-inset-bottom]">
    <div className="grid grid-cols-5 gap-1 p-2">
      <Link to="/" className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <Home className="w-5 h-5 mb-0.5" /> 
        Início
      </Link>
      
      <Link to="/search" className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <Search className="w-5 h-5 mb-0.5" /> 
        Procurar
      </Link>

      <Link to="/messages" className="relative flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <MessageSquare className="w-5 h-5 mb-0.5" />
        <NotificationBadge />
        Mensagens
      </Link>

      <Link to="/favorites" className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <Heart className="w-5 h-5 mb-0.5" /> 
        Favoritos
      </Link>

      <Link to="/dashboard" className="flex flex-col items-center justify-center py-2 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <LayoutDashboard className="w-5 h-5 mb-0.5" /> 
        Painel
      </Link>
    </div>
  </div>
)}
  </header>
);
}