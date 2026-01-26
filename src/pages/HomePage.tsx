import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Home as HomeIcon, Building2, Warehouse, Store, Trees } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PropertyCard from '@/components/features/PropertyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { CITIES, PROPERTY_TYPES } from '@/constants';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const { data: featuredProperties, isLoading } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('*, user_profiles(username, email)')
        .eq('status', 'active')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data as Property[];
    },
  });

  const { data: premiumProperties } = useQuery({
    queryKey: ['premium-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('*, user_profiles(username, email)')
        .eq('status', 'active')
        .eq('is_premium', true)
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data as Property[];
    },
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/search?${params.toString()}`);
  };

  const categories = [
    { icon: HomeIcon, label: 'Casas', value: 'house', color: 'bg-blue-500' },
    { icon: Building2, label: 'Quartos', value: 'room', color: 'bg-green-500' },
    { icon: Store, label: 'Barracas', value: 'barraca', color: 'bg-orange-500' },
    { icon: Trees, label: 'Terrenos', value: 'land', color: 'bg-emerald-500' },
    { icon: Store, label: 'Comercial', value: 'commercial', color: 'bg-purple-500' },
    { icon: Warehouse, label: 'Armazéns', value: 'warehouse', color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Encontre a Casa dos Seus Sonhos em
              <span className="gradient-primary bg-clip-text text-transparent"> Moçambique</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Milhares de imóveis para comprar ou alugar nas melhores localizações
            </p>

            {/* Search Bar */}
            <div className="bg-background rounded-xl shadow-2xl p-4 md:p-6 space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Input
                    placeholder="Procurar por localização, tipo de imóvel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-12"
                  />
                </div>
                <div>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-12 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Todas as Cidades</option>
                    {CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full h-12 text-base" size="lg">
                <Search className="w-5 h-5 mr-2" />
                Procurar Imóveis
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">1000+</div>
                <div className="text-sm text-muted-foreground">Imóveis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Vendedores</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">12</div>
                <div className="text-sm text-muted-foreground">Cidades</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Categorias Populares</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.value}
                to={`/search?type=${category.value}`}
                className="group"
              >
                <div className="bg-background rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-16 h-16 ${category.color} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-semibold">{category.label}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties && featuredProperties.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold">Imóveis em Destaque</h2>
              <Button variant="outline" asChild>
                <Link to="/search">Ver Todos</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Premium Properties */}
      {premiumProperties && premiumProperties.length > 0 && (
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold">Anúncios Premium</h2>
                <p className="text-muted-foreground mt-2">Imóveis verificados e destacados</p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/search?premium=true">Ver Todos</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {premiumProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para Publicar o Seu Imóvel?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Alcance milhares de potenciais compradores e inquilinos
          </p>
          <Button size="lg" variant="secondary" asChild className="shadow-xl">
            <Link to="/dashboard">Publicar Imóvel Grátis</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
