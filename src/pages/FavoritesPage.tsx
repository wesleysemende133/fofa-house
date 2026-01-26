import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/features/PropertyCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';

export default function FavoritesPage() {
  const { user } = useAuth();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Dentro da FavoritesPage.tsx, na sua queryFn:
    const { data, error } = await supabase
  .from('favorites')
 .select(`
  property_id,
  houses (*)
`) // Mudamos de properties para houses
  .eq('user_id', user!.id)
  .order('created_at', { ascending: false });

if (error) throw error;

// O map deve extrair 'houses'
return (data as any[])
  .map(f => f.houses)
  .filter(h => h !== null) as Property[];

      if (error) {
        console.error("Erro na busca de favoritos:", error.message);
        throw error;
      }

      // Mapeamos os dados para extrair o objeto da casa (houses)
      return (data as any[])
        .map(f => f.houses)
        .filter(house => house !== null) as Property[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8">Meus Favoritos</h1>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="mb-4 text-6xl text-gray-300 flex justify-center">❤️</div>
            <p className="text-muted-foreground text-xl">Ainda não guardou nenhuma casa favorita.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}