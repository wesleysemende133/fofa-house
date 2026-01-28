import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Heart, MapPin, Phone, Share2, Flag, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { formatPrice, formatDate, getPropertyTypeLabel, getListingTypeLabel } from '@/lib/utils';
import { useEffect } from 'react';
import { REPORT_REASONS } from '@/constants';

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

      // Increment view count
      await supabase
        .from('houses')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);

      return data as Property;
    },
  });
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

  // Não permitir que o dono do imóvel mande mensagem para si mesmo
  if (user.id === property.user_id) {
    toast({ title: 'Este imóvel é seu', description: 'Você não pode iniciar um chat consigo mesmo.' });
    return;
  }

  try {
    // 1. Verificar se já existe uma sala para este imóvel entre estes dois usuários
    const { data: existingRoom, error: fetchError } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('property_id', property.id)
      .eq('buyer_id', user.id)
      .single();

    if (existingRoom) {
      // Se já existe, apenas navegamos
      navigate('/messages');
      return;
    }

    // 2. Se não existe, criamos a sala
    const { data: newRoom, error: createError } = await supabase
      .from('chat_rooms')
      .insert({
        property_id: property.id,
        buyer_id: user.id,
        seller_id: property.user_id
      })
      .select()
      .single();

    if (createError) throw createError;

    // 3. Redirecionar para a página de mensagens
    navigate('/messages');
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
      if (!user) {
        toast({ title: 'Faça login para reportar', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          property_id: id!,
          reason: reportReason,
          description: reportDescription,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
      toast({ title: 'Denúncia enviada', description: 'Obrigado pelo seu reporte' });
    },
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
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="relative aspect-[16/10] bg-muted rounded-xl overflow-hidden group">
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={nextImage}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </>
              )}

              {property.is_premium && (
                <Badge className="absolute top-4 left-4 gradient-primary border-0 text-white shadow-premium">
                  Premium
                </Badge>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-video rounded-lg overflow-hidden border-2 ${
                      idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                  <div className="flex items-center text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.neighborhood}, {property.district}, {property.city}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(property.price)} MT
                  </div>
                  <Badge className="mt-2">
                    {getListingTypeLabel(property.listing_type)}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge variant="outline">{getPropertyTypeLabel(property.property_type)}</Badge>
                <Badge variant="outline">{property.view_count || 0} visualizações</Badge>
              </div>

              <div className="prose max-w-none">
                <h3 className="font-semibold text-lg mb-2">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
              </div>

              {property.latitude && property.longitude && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Localização</h3>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Mapa: {property.latitude}, {property.longitude}</p>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Publicado em {formatDate(property.created_at)}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-6 space-y-4 sticky top-20">
              <h3 className="font-semibold text-lg">Contactar Vendedor</h3>
              
                <div className="space-y-4">
                  {/* Botão de Chat - O Destaque (Estilo Premium) */}
                  <Button 
                    onClick={startChat}
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-200 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Chat Interno
                  </Button>

                  {/* Grid para os botões secundários - Organiza melhor o espaço */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-600"
                      asChild
                    >
                      <a href={`https://wa.me/${property.contact_whatsapp || property.contact_phone}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>

                    <Button 
                      variant="outline" 
                      className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-600"
                      asChild
                    >
                      <a href={`tel:${property.contact_phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        Ligar
                      </a>
                    </Button>
                  </div>

                  {/* Botões de utilidade - Mais discretos */}
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-600 hover:text-orange-600 hover:bg-orange-50"
                      onClick={() => toggleFavorite.mutate()}
                    >
                      <Heart className={`w-4 h-4 mr-3 ${isFavorited ? 'fill-orange-600 text-orange-600' : ''}`} />
                      {isFavorited ? 'Remover dos Favoritos' : 'Guardar nos Favoritos'}
                    </Button>

                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-gray-600 hover:text-orange-600 hover:bg-orange-50" 
                      onClick={handleShare}
                    >
                      <Share2 className="w-4 h-4 mr-3" />
                      Partilhar este Imóvel
                    </Button>
                  </div>

                  <hr className="border-gray-100" />

                  <Button
                    variant="ghost"
                    className="w-full text-xs text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => setShowReportDialog(true)}
                  >
                    <Flag className="w-3 h-3 mr-2" />
                    Denunciar este anúncio
                  </Button>
                </div>

              <div className="pt-4 border-t space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Publicado por:</span>
                  <p className="font-medium">{property.user_profiles?.username}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Anúncio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
              >
                <option value="">Selecione um motivo</option>
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Forneça mais detalhes..."
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => submitReport.mutate()}
              disabled={!reportReason}
              className="w-full"
            >
              Enviar Denúncia
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
