import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Flag, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Busca APENAS denúncias PENDENTES através da VIEW
  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_reports_detailed') 
        .select('*')
        .eq('status', 'pending') // Este filtro garante que a denúncia resolvida saia da tela
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // 2. Resolve uma denúncia (Arquiva e remove da lista)
  const resolveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved' }) 
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Força o React Query a ler o banco novamente, limpando a tela
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Denúncia processada e removida da lista' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao resolver', description: err.message, variant: 'destructive' });
    }
  });

  // 3. Elimina o imóvel e resolve a denúncia automaticamente
  const deleteProperty = useMutation({
    mutationFn: async ({ propertyId, reportId }: { propertyId: string, reportId: string }) => {
      // 1. Apaga o imóvel
      const { error: deleteError } = await supabase
        .from('houses')
        .delete()
        .eq('id', propertyId);
      
      if (deleteError) throw deleteError;

      // 2. Marca a denúncia como resolvida para ela sumir da tela
      const { error: reportError } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);
        
      if (reportError) throw reportError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Imóvel banido e lista atualizada' });
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Gestão de Denúncias</h1>
          <p className="text-slate-500">Mantenha a plataforma limpa e segura.</p>
        </header>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Denúncias Pendentes ({reports?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4 outline-none">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>A sincronizar denúncias...</p>
              </div>
            ) : reports && reports.length > 0 ? (
              reports.map((report: any) => (
                <Card key={report.id} className="p-6 border-l-4 border-l-red-600 shadow-sm bg-white">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="font-bold uppercase text-[10px]">
                          {report.reason}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-xl text-slate-800">
                          {report.house_title || "Imóvel ID: " + report.property_id}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Denunciado por: <span className="font-medium text-slate-700">{report.reporter_username || 'Anónimo'}</span>
                        </p>
                      </div>

                      {report.description && (
                        <div className="p-3 bg-slate-50 rounded-lg text-sm italic text-slate-600 border border-slate-100">
                          "{report.description}"
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[160px]">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => resolveReport.mutate(report.id)}
                        disabled={resolveReport.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Resolvida
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Atenção: Eliminar este imóvel permanentemente?')) {
                            deleteProperty.mutate({ 
                              propertyId: report.property_id, 
                              reportId: report.id 
                            });
                          }
                        }}
                        disabled={deleteProperty.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Imóvel
                      </Button>

                      <Button variant="outline" size="sm" asChild>
                        <a href={`/property/${report.property_id}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver Anúncio
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">Tudo limpo!</h3>
                <p className="text-slate-500">Não existem denúncias pendentes para revisão.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}