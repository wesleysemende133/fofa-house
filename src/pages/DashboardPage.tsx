import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types';
import { PROPERTY_TYPES, LISTING_TYPES, CITIES } from '@/constants';
import { formatPrice } from '@/lib/utils';
import { ContactPhoneInput } from "@/components/phone-input";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const MAX_PHOTOS = 10;
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const [phone, setPhone] = useState<string | undefined>("");
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    property_type: 'house',
    listing_type: 'sale',
    city: '',
    district: '',
    neighborhood: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    contact_whatsapp: '',
    photos: [] as string[],
  });

  const handleLogout = async () => {
    try {
    toast({
      title: "Sessão encerrada",
      description: "Você saiu da sua conta com sucesso.",
    });
    navigate('/');
  } catch (error) {
    // Versão correta para erro
    toast({
      variant: "destructive", // Isso deixa o toast vermelho
      title: "Erro ao sair",
      description: "Não foi possível encerrar sua sessão. Tente novamente.",
    });
  }
  };

  const { data: properties, isLoading } = useQuery({
    queryKey: ['my-properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
  });

  const handleUpdateProfile = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ contact_phone: phone })
      .eq('id', user!.id);

    if (error) alert("Erro ao atualizar");
    else alert("Contacto guardado com sucesso!");

    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Verifica limite total
  const remainingSlots = MAX_PHOTOS - formData.photos.length;

  if (remainingSlots <= 0) {
    toast({
      title: "Limite atingido",
      description: "Você só pode adicionar até 10 fotos.",
      variant: "destructive",
    });
    return;
  }

  const filesToUpload = Array.from(files).slice(0, remainingSlots);

  setUploading(true);
  setUploadProgress(0);

  const uploadedUrls: string[] = [];
  let uploadedCount = 0;

  try {
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);

      uploadedCount++;
      setUploadProgress(
        Math.round((uploadedCount / filesToUpload.length) * 100)
      );
    }

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...uploadedUrls],
    }));

    toast({
      title: "Upload concluído",
      description: `${uploadedUrls.length} foto(s) carregada(s) com sucesso.`,
    });
  } catch (error: any) {
    toast({
      title: "Erro ao carregar fotos",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};


  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const saveProperty = useMutation({
    mutationFn: async () => {
      // Função para evitar duplicação do prefixo 258 ao salvar
      const cleanPhone = (num: string) => {
        const raw = num.replace(/\D/g, ''); // Remove caracteres não numéricos
        // Se começar com 258258, remove os primeiros 3 dígitos
        return raw.startsWith('258258') ? raw.substring(3) : raw;
      };

      const propertyData = {
        ...formData,
        user_id: user!.id,
        // Limpa os números antes de enviar
        contact_phone: cleanPhone(formData.contact_phone),
        contact_whatsapp: cleanPhone(formData.contact_whatsapp),
        price: parseFloat(formData.price),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: 'active',
        is_approved: true
      };

      if (editingProperty) {
        const { error } = await supabase
          .from('houses')
          .update(propertyData)
          .eq('id', editingProperty.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('houses')
          .insert(propertyData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      setShowDialog(false);
      resetForm();
      toast({
        title: editingProperty ? 'Imóvel atualizado' : 'Imóvel publicado!',
        description: 'O seu imóvel já está visível para todos os utilizadores.'
      });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast({ title: 'Imóvel eliminado' });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      property_type: 'house',
      listing_type: 'sale',
      city: '',
      district: '',
      neighborhood: '',
      latitude: '',
      longitude: '',
      contact_phone: '',
      contact_whatsapp: '',
      photos: [],
    });
    setEditingProperty(null);
  };

  const openEditDialog = (property: Property) => {
    // Função para limpar visualmente se o dado vier corrompido do banco
    const cleanPhone = (val: string | null) => {
      if (!val) return "";
      const raw = val.replace(/\D/g, '');
      return raw.startsWith('258258') ? raw.substring(3) : raw;
    };

    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description,
      price: property.price.toString(),
      property_type: property.property_type,
      listing_type: property.listing_type,
      city: property.city,
      district: property.district,
      neighborhood: property.neighborhood,
      latitude: property.latitude?.toString() || '',
      longitude: property.longitude?.toString() || '',
      contact_phone: cleanPhone(property.contact_phone),
      contact_whatsapp: cleanPhone(property.contact_whatsapp || ''),
      photos: property.photos || [],
    });
    setShowDialog(true);
  };

  const openNewDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Meus Imóveis</h1>
            <p className="text-muted-foreground">Gerir as suas publicações</p>
          </div>
          <Button onClick={openNewDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Imóvel
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-border bg-card"
              >
                {/* Imagem */}
                <div className="relative aspect-[4/3] bg-muted">
                  <img
                    src={property.photos[0] || 'https://via.placeholder.com/400x300'}
                    alt={property.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge Status */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                      {property.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>

                    {property.is_premium && (
                      <Badge className="bg-yellow-500 text-white border-0">
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-base line-clamp-1">
                    {property.title}
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    {property.neighborhood}, {property.city}
                  </p>

                  <p className="text-2xl font-bold text-primary">
                    {formatPrice(property.price)} MT
                  </p>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Eye className="w-4 h-4 mr-1" />
                    {property.view_count || 0} visualizações
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditDialog(property)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja eliminar este imóvel?')) {
                          deleteProperty.mutate(property.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Ainda não tem imóveis publicados</p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Publicar Primeiro Imóvel
            </Button>
          </div>
        )}
      </div>

      {/* Property Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/40">
            <DialogTitle className="text-xl font-bold">
              {editingProperty ? 'Editar Imóvel' : 'Publicar Novo Imóvel'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-8">

            {/* INFORMAÇÕES PRINCIPAIS */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Informações do Imóvel</h2>

              <div>
                <label className="text-sm font-medium">Título*</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Casa T3 moderna na Polana"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição*</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva os detalhes do imóvel..."
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Preço (MT)*</label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="Ex: 3500000"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tipo de Imóvel</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    {PROPERTY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Anúncio</label>
                <select
                  value={formData.listing_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, listing_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                >
                  {LISTING_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* LOCALIZAÇÃO */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Localização</h2>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Cidade*</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  >
                    <option value="">Selecione</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Distrito*</label>
                  <Input
                    value={formData.district}
                    onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Bairro*</label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="any"
                  placeholder="Latitude (opcional)"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Longitude (opcional)"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                />
              </div>
            </div>

            {/* CONTACTOS */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">Contactos</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Telefone*</label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-1 py-1">
                    <ContactPhoneInput
                      value={formData.contact_phone}
                      onChange={(v: string) => setFormData(prev => ({ ...prev, contact_phone: v }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">WhatsApp</label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-1 py-1">
                    <ContactPhoneInput
                      value={formData.contact_whatsapp}
                      onChange={(v: string) => setFormData(prev => ({ ...prev, contact_whatsapp: v }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOTOS ESTILO OLX */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold border-b pb-2">
                Fotos ({formData.photos.length}/10)
              </h2>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted transition cursor-pointer">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading || formData.photos.length >= 10}
                  className="hidden"
                  id="photoUpload"
                />
                <label htmlFor="photoUpload" className="cursor-pointer">
                  <p className="font-medium">Clique para adicionar fotos</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Máximo 10 imagens
                  </p>
                </label>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-muted-foreground">
                    {uploadProgress}% carregado
                  </p>
                </div>
              )}

              {formData.photos.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={photo}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 w-7 h-7 opacity-0 group-hover:opacity-100 transition"
                        onClick={() => removePhoto(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÃO */}
            <Button
              onClick={() => saveProperty.mutate()}
              className="w-full h-12 text-lg font-semibold"
              disabled={
                !formData.title ||
                !formData.description ||
                !formData.price ||
                !formData.city ||
                !formData.district ||
                !formData.neighborhood ||
                !formData.contact_phone
              }
            >
              {editingProperty ? 'Atualizar Imóvel' : 'Publicar Imóvel'}
            </Button>

          </div>
        </DialogContent>

      </Dialog>

      <Footer />
    </div>
  );
}