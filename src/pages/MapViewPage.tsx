import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { formatPrice } from '@/lib/utils';

export default function MapViewPage() {
  const { data: properties } = useQuery({
    queryKey: ['properties-with-location'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('status', 'active')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      return data as Property[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8">Mapa de Imóveis</h1>

        <div className="bg-muted rounded-xl aspect-video flex items-center justify-center mb-8">
          <div className="text-center">
            <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Mapa interativo em desenvolvimento</p>
            <p className="text-sm text-muted-foreground mt-2">
              {properties?.length || 0} imóveis com localização
            </p>
          </div>
        </div>

        {properties && properties.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Imóveis com Localização</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  to={`/property/${property.id}`}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.city}</p>
                  <p className="text-lg font-bold text-primary mt-2">
                    {formatPrice(property.price)} MT
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📍 {property.latitude}, {property.longitude}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
