import { Link } from 'react-router-dom';
import { Home, Facebook, Instagram, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-secondary border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">Fofa House</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Encontre a casa dos seus sonhos em Moçambique.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search" className="text-muted-foreground hover:text-primary">Procurar Imóveis</Link></li>
              <li><Link to="/map" className="text-muted-foreground hover:text-primary">Mapa</Link></li>
              <li><Link to="/dashboard" className="text-muted-foreground hover:text-primary">Publicar Imóvel</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Categorias</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search?type=house" className="text-muted-foreground hover:text-primary">Casas</Link></li>
              <li><Link to="/search?type=room" className="text-muted-foreground hover:text-primary">Quartos</Link></li>
              <li><Link to="/search?type=land" className="text-muted-foreground hover:text-primary">Terrenos</Link></li>
              <li><Link to="/search?type=commercial" className="text-muted-foreground hover:text-primary">Lojas</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center text-muted-foreground">
                <Mail className="w-4 h-4 mr-2" />
                info@fofahouse.co.mz
              </li>
              <li className="flex items-center text-muted-foreground">
                <Phone className="w-4 h-4 mr-2" />
                +258 84 123 4567
              </li>
            </ul>
            <div className="flex space-x-3 mt-4">
              <a href="#" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Facebook className="w-4 h-4 text-primary" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Instagram className="w-4 h-4 text-primary" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Fofa House. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
