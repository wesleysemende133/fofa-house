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
 const { data, error } = await supabase
  .from('favorites')
  .select(`
    property_id,
    houses!property_id (
      *,
      user_profiles (
        username,
        email
      )
    )
  `)
  .eq('user_id', user!.id)
  .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro na busca de favoritos:", error.message);
      throw error;
    }

    // Extraímos apenas o objeto 'houses' e filtramos nulos (caso uma casa tenha sido deletada)
    return (data as any[])
      .filter(f => f.houses !== null)
      .map(f => f.houses) as Property[];
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