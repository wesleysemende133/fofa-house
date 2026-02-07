
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Flag, ExternalLink } from 'lucide-react';
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

  
  // 1. Busca as denúncias através da VIEW para evitar erros de tipo (UUID vs TEXT)
const { data: reports, isLoading } = useQuery({
  queryKey: ['admin-reports'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('admin_reports_detailed') // Nome da VIEW que criámos no SQL
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },
});

  // 2. Resolve uma denúncia (marca como lida/resolvida)
  const resolveReport = useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Denúncia marcada como resolvida' });
    },
  });

  // 3. Elimina o imóvel denunciado (caso o admin decida que ele é impróprio)
  const deleteProperty = useMutation({
    mutationFn: async (propertyId: string | number) => {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', propertyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Imóvel removido permanentemente' });
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8">Painel de Gestão de Denúncias</h1>

        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList>
            <TabsTrigger value="reports">
              <Flag className="w-4 h-4 mr-2" />
              Denúncias Pendentes ({reports?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10">A carregar denúncias...</div>
            ) : reports && reports.length > 0 ? (
              reports.map((report: any) => (
                <Card key={report.id} className="p-6 border-l-4 border-l-destructive">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">
                          Motivo: <span className="text-destructive">{report.reason}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {/* AGORA USAMOS house_title QUE VEM DA VIEW */}
                          Imóvel: <span className="font-medium text-foreground">{report.house_title || 'ID: ' + report.property_id}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {/* AGORA USAMOS reporter_username QUE VEM DA VIEW */}
                          Denunciado por: {report.reporter_username || 'Anónimo'} • {formatDate(report.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline">Pendente</Badge>
                    </div>

                    {report.description && (
                      <div className="bg-muted p-3 rounded-md text-sm italic">
                        "{report.description}"
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => resolveReport.mutate(report.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Ignorar / Resolvida
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm('ATENÇÃO: Isto eliminará o imóvel denunciado para sempre. Continuar?')) {
                            deleteProperty.mutate(report.property_id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar Imóvel
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/property/${report.property_id}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ver Imóvel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                Nenhuma denúncia por processar. Bom trabalho!
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

// Nota: Importe o 'CheckCircle' do lucide-react caso dê erro, ou use o ícone que preferir.
import { CheckCircle } from 'lucide-react';