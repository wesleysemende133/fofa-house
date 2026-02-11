import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Heart, MapPin, Phone, Share2, Flag, ChevronLeft, ChevronRight,MessageSquare, Maximize2, X } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { formatPrice, formatDate, getPropertyTypeLabel, getListingTypeLabel } from '@/lib/utils';
import { useEffect } from 'react';
import { REPORT_REASONS } from '@/constants';
import { ImageOverlay } from "@/components/features/ImageOverlay"

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');

const { data: property, isLoading } = useQuery({
  queryKey: ['property', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('houses')
      .select('*, user_profiles(username, email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Property;
  },
});

useEffect(() => {
  // 1. Validar se o ID existe e é um número
  const houseIdNum = parseInt(id as string, 10);
  
  if (isNaN(houseIdNum)) return;

  const incrementViews = async () => {
    try {
      // 2. Chamar a função RPC que criamos no SQL
      const { error } = await supabase.rpc('increment_house_views', { 
        house_id: houseIdNum 
      });

      if (error) {
        console.error("Erro ao incrementar views:", error.message);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    }
  };

  // 3. Executar
  incrementViews();
  
  // Opcional: Você pode salvar no sessionStorage para não contar 
  // visualizações repetidas do mesmo usuário na mesma aba.
}, [id]); // Executa sempre que o ID na URL mudar
  useEffect(() => {
  // Verificamos se 'property' existe e se tem fotos (photos)
  if (property && Array.isArray(property.photos) && property.photos.length > 0) {
    const mainPhotoUrl = property.photos[0];
    
    // 1. Atualiza o título da aba
    document.title = `Fofa House | ${property.title}`;
    
    // 2. Função segura para atualizar Meta Tags
    const updateMeta = (selector: string, content: string) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute('content', content);
      }
    };

    // Atualiza as tags para as redes sociais verem a foto
    updateMeta('meta[property="og:image"]', mainPhotoUrl);
    updateMeta('meta[property="og:title"]', property.title);
    updateMeta('meta[property="twitter:image"]', mainPhotoUrl);
    updateMeta('meta[name="description"]', property.description.substring(0, 160));
  }
}, [property?.id, property?.photos]); // Dependências específicas para evitar loops infinitos

  const { data: isFavorited } = useQuery({
    queryKey: ['favorite', id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('property_id', id!)
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const startChat = async () => {
  if (!user) {
    toast({ title: 'Faça login para contactar o vendedor', variant: 'destructive' });
    return;
  }

  if (user.id === property.user_id) {
    toast({ title: 'Este imóvel é seu', description: 'Você não pode iniciar um chat consigo mesmo.' });
    return;
  }

  try {
    // 1. Usamos maybeSingle() para não disparar erro caso a sala não exista
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('property_id', property.id)
      .eq('buyer_id', user.id)
      .maybeSingle();

    if (existingRoom) {
      // Passamos os parâmetros na URL para a MessagesPage saber qual abrir
      navigate(`/messages?prop=${property.id}&user=${property.user_id}`);
      return;
    }

    // 2. Corrigido: 'seller_id' alterado para 'owner_id' para bater com o banco
    const { data: newRoom, error: createError } = await supabase
      .from('chat_rooms')
      .insert({
        property_id: property.id,
        buyer_id: user.id,
        owner_id: property.user_id // Verifique se o banco aceita 'owner_id'
      })
      .select()
      .single();

    if (createError) throw createError;

    navigate(`/messages?prop=${property.id}&user=${property.user_id}`);
    toast({ title: 'Conversa iniciada!' });

  } catch (error) {
    console.error('Erro ao iniciar chat:', error);
    toast({ title: 'Erro ao iniciar conversa', variant: 'destructive' });
  }
};

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) {
        toast({ title: 'Faça login para adicionar aos favoritos', variant: 'destructive' });
        return;
      }

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, property_id: id! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', id, user?.id] });
      toast({ title: isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos' });
    },
  });

  const submitReport = useMutation({
  mutationFn: async () => {
    if (!user) throw new Error("Utilizador não autenticado");

    const { error } = await supabase
      .from('reports')
      .insert({
        user_id: user.id,
        property_id: String(id), // Convertemos para string para bater com o banco
        reason: reportReason,
        description: reportDescription,
      });

    if (error) throw error;
  },
  onSuccess: () => {
    // 1. Fecha o modal imediatamente
    setShowReportDialog(false); 
    
    // 2. Limpa os campos para a próxima vez
    setReportReason('');
    setReportDescription('');
    
    // 3. Mostra o feedback visual
    toast({ 
      title: 'Denúncia enviada', 
      description: 'Obrigado! A nossa equipa irá analisar o anúncio.' 
    });
  },
  onError: (error: any) => {
    toast({ 
      title: 'Erro ao enviar', 
      description: error.message, 
      variant: 'destructive' 
    });
  }
});

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Imóvel não encontrado</p>
            <Button onClick={() => navigate('/')} className="mt-4">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const images = property.photos.length > 0 ? property.photos : ['https://via.placeholder.com/800x600?text=Sem+Foto'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const handleShare = async () => {
  if (!property) return;

    const shareData = {
    title: property.title,
    text: `Olha este imóvel no Fofa House: ${property.title}`,
    url: window.location.href, // Pega o link real do seu site na Vercel
  };

  try {
    if (navigator.share) {
      // Abre a janelinha nativa do celular (WhatsApp, Instagram, etc)
      await navigator.share(shareData);
    } else {
      // Se estiver no PC, apenas copia o link
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
    }
  } catch (err) {
    console.log("Erro ao partilhar:", err);
  }
};

return (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <Header />

    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 flex-1 max-w-6xl">
      
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)} 
        className="mb-6 text-gray-600 hover:text-black"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">

        {/* COLUNA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-6 order-1">

          {/* GALERIA */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden cursor-zoom-in shadow-sm">
                <img
                  src={images[currentImageIndex]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />

                {images.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow"
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow"
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>

                    <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-sm">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {property.is_premium && (
                  <Badge className="absolute top-3 left-3 bg-yellow-500 text-white border-0">
                    Premium
                  </Badge>
                )}
              </div>
            </DialogTrigger>

            <DialogContent className="max-w-[100vw] w-full h-full p-0 border-none bg-black/95 flex items-center justify-center shadow-none">
              <DialogClose className="absolute right-6 top-6 z-50 rounded-full p-2 bg-white/10 text-white hover:bg-white/20">
                <X className="w-8 h-8" />
              </DialogClose>

              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={images[currentImageIndex]}
                  alt={property.title}
                  className="max-w-full max-h-[90vh] object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* THUMBNAILS */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`aspect-video rounded-md overflow-hidden border ${
                    idx === currentImageIndex 
                      ? 'border-primary' 
                      : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* INFO PRINCIPAL */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 leading-snug">
                  {property.title}
                </h1>

                <div className="flex items-center text-gray-500 mt-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  {property.neighborhood}, {property.district}, {property.city}
                </div>
              </div>

              <div className="md:text-right">
                <div className="text-3xl md:text-4xl font-bold text-gray-900">
                  {formatPrice(property.price)} MT
                </div>

                <Badge className="mt-2 bg-primary/10 text-primary border-0">
                  {getListingTypeLabel(property.listing_type)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline">
                {getPropertyTypeLabel(property.property_type)}
              </Badge>

              <Badge variant="outline">
                {property.view_count || 0} visualizações
              </Badge>
            </div>
          </div>
        </div>

        {/* SIDEBAR ESTILO OLX */}
        <div className="space-y-4 order-2">
          <Card className="p-6 space-y-5 sticky top-24 border border-gray-200 shadow-sm bg-white rounded-lg">

            <h3 className="font-semibold text-lg text-gray-900">
              Contactar Vendedor
            </h3>

            <Button 
             className="w-full bg-primary hover:bg-primary/90 text-white font-semibold"
              size="lg" 
              onClick={startChat}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat Interno
            </Button>

            <div className="space-y-3">

              <Button 
                className="w-full border-green-500 text-green-600 hover:bg-green-50 font-medium"
                size="lg" 
                asChild 
                variant="outline"
              >
                <a 
                  href={`https://wa.me/${(property.contact_whatsapp || property.contact_phone || "").replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>

              <Button 
                variant="outline" 
                className="w-full border-gray-300 hover:bg-gray-50 font-medium"
                size="lg" 
                asChild
              >
                <a 
                  href={`tel:${property.contact_phone}`} 
                  className="flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Ligar
                </a>
              </Button>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => toggleFavorite.mutate()}
              >
                <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                {isFavorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </Button>

              <Button
                  variant="outline"
                  className="w-full flex items-center justify-center"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partilhar
              </Button>

              <Button 
                variant="ghost"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => setShowReportDialog(true)}
              >
                <Flag className="w-4 h-4 mr-2" />
                Reportar Anúncio
              </Button>
            </div>

            <div className="pt-4 border-t text-sm text-gray-600">
              Publicado por:
              <p className="font-medium text-gray-900">
                {property.user_profiles?.username}
              </p>
            </div>

          </Card>
        </div>

        {/* DESCRIÇÃO */}
        <div className="lg:col-span-2 space-y-6 order-3">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">
              Descrição
            </h3>

            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {property.latitude && property.longitude && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                Localização
              </h3>

              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                <p className="text-gray-500">
                  Mapa: {property.latitude}, {property.longitude}
                </p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            Publicado em {formatDate(property.created_at)}
          </div>
        </div>
      </div>
    </div>

    <Footer />
  </div>
);
}