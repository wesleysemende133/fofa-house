import { Link, useNavigate } from 'react-router-dom';
import { Home, Facebook, Instagram, Mail, Phone, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Certifica-te que o caminho do context está correto

export default function Footer() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair da sua conta?')) {
      await logout();
      navigate('/');
    }
  };
  return (
    /* pb-32 garante que o conteúdo final fique bem acima da barra fixa no mobile */
    <footer className="bg-secondary border-t mt-20 pb-32 md:pb-12">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Coluna 1: Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">Fofa House</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Encontre a casa dos seus sonhos em Moçambique.
            </p>
          </div>

          {/* Coluna 2: Links Rápidos */}
          <div>
            <h3 className="font-semibold mb-4 text-slate-900">Links Rápidos</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/search" className="text-muted-foreground hover:text-primary transition-colors">Procurar Imóveis</Link></li>
              <li><Link to="/map" className="text-muted-foreground hover:text-primary transition-colors">Mapa</Link></li>
              <li><Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Publicar Imóvel</Link></li>
            </ul>
          </div>

          {/* Coluna 3: Categorias */}
          <div>
            <h3 className="font-semibold mb-4 text-slate-900">Categorias</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/search?type=house" className="text-muted-foreground hover:text-primary transition-colors">Casas</Link></li>
              <li><Link to="/search?type=room" className="text-muted-foreground hover:text-primary transition-colors">Quartos</Link></li>
              <li><Link to="/search?type=land" className="text-muted-foreground hover:text-primary transition-colors">Terrenos</Link></li>
              <li><Link to="/search?type=commercial" className="text-muted-foreground hover:text-primary transition-colors">Lojas</Link></li>
            </ul>
          </div>

          {/* Coluna 4: Contacto e Logout com Espaçamento */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-4 text-slate-900">Contacto</h3>
            <ul className="space-y-3 text-sm mb-8">
              <li className="flex items-center text-muted-foreground">
                <Mail className="w-4 h-4 mr-2 text-primary" />
                info@fofahouse.co.mz
              </li>
              <li className="flex items-center text-muted-foreground">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                +258 85 170 0363
              </li>
            </ul>

            {/* Redes Sociais */}
            <div className="flex space-x-4 mb-8">
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all">
                <Facebook className="w-5 h-5 text-primary" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all">
                <Instagram className="w-5 h-5 text-primary" />
              </a>
            </div>

            {/* Botão Sair da Conta com espaçamento extra (mt-4) */}
            {user && (
              <div className="pt-6 border-t border-slate-200 mt-2">
                <button 
                  onClick={handleLogout}
                  className="flex items-center text-red-500 hover:text-red-700 font-semibold text-sm transition-colors active:scale-95 origin-left"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Fofa House. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}