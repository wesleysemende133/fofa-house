import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/features/PropertyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { CITIES, PROPERTY_TYPES, LISTING_TYPES } from '@/constants';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    district: searchParams.get('district') || '',
    property_type: searchParams.get('type') || '',
    listing_type: searchParams.get('listing') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    with_photos: searchParams.get('with_photos') === 'true',
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', filters],
    queryFn: async () => {
      let query = supabase
        .from('houses')
        .select('*, user_profiles(username, email)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters.city) query = query.eq('city', filters.city);
      if (filters.district) query = query.ilike('district', `%${filters.district}%`);
      if (filters.property_type) query = query.eq('property_type', filters.property_type);
      if (filters.listing_type) query = query.eq('listing_type', filters.listing_type);
      if (filters.min_price) query = query.gte('price', parseFloat(filters.min_price));
      if (filters.max_price) query = query.lte('price', parseFloat(filters.max_price));
      if (filters.keyword) {
        query = query.or(`title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data as Property[];

      if (filters.with_photos) {
        results = results.filter(p => p.photos && p.photos.length > 0);
      }

      return results;
    },
  });

  const updateFilter = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value.toString());
    });
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      city: '',
      district: '',
      property_type: '',
      listing_type: '',
      min_price: '',
      max_price: '',
      with_photos: false,
    });
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Procurar Imóveis</h1>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className={`md:col-span-1 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <Card className="p-6 space-y-6 sticky top-20">
              <div>
                <h3 className="font-semibold mb-3 flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Palavra-chave</label>
                <Input
                  placeholder="Procurar..."
                  value={filters.keyword}
                  onChange={(e) => updateFilter('keyword', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <select
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="">Todas</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Distrito</label>
                <Input
                  placeholder="Nome do distrito"
                  value={filters.district}
                  onChange={(e) => updateFilter('district', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Imóvel</label>
                <select
                  value={filters.property_type}
                  onChange={(e) => updateFilter('property_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="">Todos</option>
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Anúncio</label>
                <select
                  value={filters.listing_type}
                  onChange={(e) => updateFilter('listing_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="">Todos</option>
                  {LISTING_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preço Mínimo (MT)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.min_price}
                  onChange={(e) => updateFilter('min_price', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preço Máximo (MT)</label>
                <Input
                  type="number"
                  placeholder="Sem limite"
                  value={filters.max_price}
                  onChange={(e) => updateFilter('max_price', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="with_photos"
                  checked={filters.with_photos}
                  onChange={(e) => updateFilter('with_photos', e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="with_photos" className="text-sm font-medium">
                  Apenas com fotos
                </label>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Button onClick={applyFilters} className="w-full">
                  Aplicar Filtros
                </Button>
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </Card>
          </aside>

          {/* Results */}
          <div className="md:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted aspect-[4/3] rounded-t-lg" />
                    <div className="bg-muted h-32 rounded-b-lg mt-2" />
                  </div>
                ))}
              </div>
            ) : properties && properties.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  {properties.length} {properties.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">Nenhum imóvel encontrado</p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
