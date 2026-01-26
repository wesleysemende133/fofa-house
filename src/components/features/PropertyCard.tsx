import { Link } from 'react-router-dom';
import { Heart, MapPin, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Property } from '@/types';
import { formatPrice } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export default function PropertyCard({ property, onFavorite, isFavorited }: PropertyCardProps) {
  const mainImage = property.photos[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto';

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in">
      <Link to={`/property/${property.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={mainImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {property.is_premium && (
            <Badge className="absolute top-3 left-3 gradient-primary border-0 text-white shadow-premium">
              Premium
            </Badge>
          )}
          {property.is_featured && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 border-0 text-white">
              Destaque
            </Badge>
          )}
          {onFavorite && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-3 right-3 rounded-full w-9 h-9 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault();
                onFavorite(property.id);
              }}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link to={`/property/${property.id}`}>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
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

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground capitalize">
                {property.property_type}
              </span>
              <Button size="sm" variant="ghost" asChild>
                <a href={`https://wa.me/${property.contact_whatsapp || property.contact_phone}`} target="_blank" rel="noopener noreferrer">
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
