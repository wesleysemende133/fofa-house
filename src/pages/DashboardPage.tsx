import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, 10); i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...uploadedUrls] }));
      toast({ title: 'Fotos carregadas com sucesso' });
    } catch (error: any) {
      toast({ title: 'Erro ao carregar fotos', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
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
      const propertyData = {
        ...formData,
        user_id: user!.id,
        price: parseFloat(formData.price),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: 'active', // Força o status ativo imediatamente
        is_approved: true // Define como aprovado automaticamente
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
      contact_phone: property.contact_phone,
      contact_whatsapp: property.contact_whatsapp || '',
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="p-4 space-y-3">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={property.photos[0] || 'https://via.placeholder.com/400x300'}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div>
                  <h3 className="font-semibold line-clamp-1">{property.title}</h3>
                  <p className="text-sm text-muted-foreground">{property.city}</p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatPrice(property.price)} MT
                  </p>
                </div>

                <div className="flex gap-2">
                  <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
  {property.status === 'active' ? 'Online / Ativo' : 'Inativo'}
</Badge>
                  {property.is_premium && (
                    <Badge className="gradient-primary border-0">Premium</Badge>
                  )}
                </div>

                <div className="flex gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {property.view_count || 0}
                  </span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProperty ? 'Editar Imóvel' : 'Novo Imóvel'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título*</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Casa T3 no centro da cidade"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição*</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o imóvel..."
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
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Imóvel*</label>
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
              <label className="text-sm font-medium">Tipo de Anúncio*</label>
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
                  placeholder="Ex: KaMpfumo"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Bairro*</label>
                <Input
                  value={formData.neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  placeholder="Ex: Polana"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Latitude (opcional)</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                  placeholder="-25.9655"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Longitude (opcional)</label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                  placeholder="32.5832"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefone*</label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="+258 84 123 4567"
                />
              </div>

              <div>
                <label className="text-sm font-medium">WhatsApp (opcional)</label>
                <Input
                  value={formData.contact_whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_whatsapp: e.target.value }))}
                  placeholder="+258 84 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Fotos (até 10)</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading || formData.photos.length >= 10}
              />
              {formData.photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {formData.photos.map((photo, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={photo} alt="" className="w-full h-full object-cover rounded" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 w-6 h-6"
                        onClick={() => removePhoto(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => saveProperty.mutate()}
              className="w-full"
              disabled={!formData.title || !formData.description || !formData.price || !formData.city || !formData.district || !formData.neighborhood || !formData.contact_phone}
            >
              {editingProperty ? 'Atualizar' : 'Publicar'} Imóvel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
