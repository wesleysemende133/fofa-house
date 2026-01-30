import { Link } from 'react-router-dom';
import { Heart, MapPin, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Property } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export default function PropertyCard({ property, onFavorite, isFavorited: initialIsFavorited }: PropertyCardProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited || false);
  const mainImage = property.photos[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto';

  

useEffect(() => {
  const checkPersistedFavorite = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', Number(property.id))
      .maybeSingle(); // Uso o maybeSingle para não dar erro se não encontrar

    if (data) {
      setIsFavorited(true);
    }
  };

  checkPersistedFavorite();
}, [user, property.id]);

  // Sincroniza o estado interno se a prop mudar
  useEffect(() => {
    setIsFavorited(initialIsFavorited || false);
  }, [initialIsFavorited]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Por favor, faça login para favoritar.");
      return;
    }

    // Se você passou uma função personalizada via props (ex: na FavoritesPage)
    if (onFavorite) {
      onFavorite(property.id);
      return;
    }

    // Lógica padrão para favoritar/desfavoritar
    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .match({ 
            user_id: user.id, 
            property_id: Number(property.id) // O bigint exige número
          });
        if (!error) setIsFavorited(false);
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ 
            user_id: user.id, 
            property_id: Number(property.id) 
          });
        if (!error) setIsFavorited(true);
      }
    } catch (err) {
      console.error("Erro ao processar favorito:", err);
    }
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Link to={`/property/${property.id}`}>
          <img
            src={mainImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </Link>
        
        {property.is_premium && (
          <Badge className="absolute top-3 left-3 gradient-primary border-0 text-white shadow-premium">
            Premium
          </Badge>
        )}
        
        {/* Botão de Favorito - Sempre Visível no mobile e hover no desktop */}
        <Button
          size="icon"
          variant="secondary"
          className={`absolute top-3 right-3 rounded-full w-9 h-9 transition-all duration-300 ${
            isFavorited ? 'opacity-100 bg-white' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={handleFavoriteClick}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </Button>
      </div>

      <CardContent className="p-4">
        <Link to={`/property/${property.id}`}>
          <div className="space-y-2">
  {/* Link apenas no Título e Info - NÃO envolve o botão de baixo */}
  <Link to={`/property/${property.id}`} className="block group/title">
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-semibold text-lg line-clamp-1 group-hover/title:text-primary transition-colors">
        {property.title}
      </h3>
      <Badge variant={property.listing_type === 'sale' ? 'default' : 'secondary'}>
        {property.listing_type === 'sale' ? 'Venda' : 'Aluguer'}
      </Badge>
    </div>

    <p className="text-2xl font-bold text-primary">
      {formatPrice(property.price)} MT
    </p>

    <div className="flex items-center text-sm text-muted-foreground">
      <MapPin className="w-4 h-4 mr-1" />
      {property.neighborhood}, {property.district}, {property.city}
    </div>
  </Link>

  {/* Área do Botão - Fica FORA do Link acima */}
  <div className="flex items-center justify-between pt-2 border-t">
    <span className="text-xs text-muted-foreground capitalize">
      {property.property_type}
    </span>
    <Button size="sm" variant="ghost" asChild>
      <a 
        href={`https://wa.me/${property.contact_whatsapp || property.contact_phone}`} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // Segurança extra
      >
        <Phone className="w-4 h-4 mr-1" />
        Contactar
      </a>
    </Button>
  </div>
</div>
        </Link>
      </CardContent>
    </Card>
  );
}