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
              <Link to="/messages" className="text-sm font-medium hover:text-primary transition-colors">
                Mensagens
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
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Painel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="cursor-pointer">
                      <Heart className="w-4 h-4 mr-2" />
                      Favoritos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/messages" className="cursor-pointer">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Mensagens
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="default">
              <Link to="/auth">Entrar / Registrar</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
          <div className="grid grid-cols-4 gap-1 p-2">
            <Link to="/" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
              <Home className="w-5 h-5 mb-1" />
              Início
            </Link>
            <Link to="/search" className="flex flex-col items-center justify-center py-2 text-xs hover:text-primary">
              <Search className="w-5 h-5 mb-1" />
              Procurar
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
