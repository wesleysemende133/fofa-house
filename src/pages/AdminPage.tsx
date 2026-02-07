import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Flag, ExternalLink, CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

 // --- SEGURANÇA: Verificação de Admin ---
useEffect(() => {
  async function verifyAdmin() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("Usuário não autenticado");
        navigate('/login');
        return;
      }

      // IMPORTANTE: Buscamos o perfil de forma simples
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao ler perfil:", profileError.message);
        // Se der erro de recursão aqui, o problema é 100% no SQL (RLS)
        return; 
      }

      if (profile?.role === 'admin') {
        setHasAccess(true);
      } else {
        console.log("Usuário não é admin. Role encontrada:", profile?.role);
        toast({ 
          title: "Acesso Negado", 
          description: "Apenas administradores podem acessar esta página.", 
          variant: "destructive" 
        });
        navigate('/'); 
      }
    } catch (err) {
      console.error("Erro crítico na verificação:", err);
    } finally {
      setIsVerifying(false);
    }
  }
  verifyAdmin();
}, [navigate]);

  // --- BUSCA DE DADOS (Só executa se for admin) ---
  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_reports_detailed') 
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: hasAccess, // Só dispara a query se for admin confirmado
  });

  // 1. Busca todos os utilizadores (profiles)
const { data: users, isLoading: loadingUsers } = useQuery({
  queryKey: ['admin-users'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('username', { ascending: true });
    if (error) throw error;
    return data;
  },
  enabled: hasAccess,
});

// 2. Mutação para mudar o cargo (Promover/Despromover)
const toggleAdmin = useMutation({
  mutationFn: async ({ userId, newRole }: { userId: string, newRole: string | null }) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    toast({ title: "Permissões atualizadas!" });
  }
});

  // Mutações (Resolver e Eliminar)
  const resolveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Resolvido com sucesso' });
    }
  });

  const deleteProperty = useMutation({
    mutationFn: async ({ propertyId, reportId }: { propertyId: string, reportId: string }) => {
      await supabase.from('houses').delete().eq('id', propertyId);
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Imóvel eliminado' });
    }
  });

  if (isVerifying) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="text-primary w-8 h-8" />
          <h1 className="text-3xl font-bold">Painel de Controlo Master</h1>
        </div>

        <Tabs defaultValue="reports">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Gestão de Utilizadores</TabsTrigger>
            <TabsTrigger value="reports">
              Denúncias Pendentes ({reports?.length || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="p-4">Utilizador</th>
                    <th className="p-4">Email / ID</th>
                    <th className="p-4">Cargo</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium">{u.username || 'Sem nome'}</td>
                      <td className="p-4 text-slate-500 text-sm">{u.id.substring(0,8)}...</td>
                      <td className="p-4">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? 'ADMIN' : 'USER'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {u.role === 'admin' ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            // BLOQUEIO: Se o email for o teu, o botão fica desativado
                            disabled={u.email === 'wesleysemende@gmail.com'} 
                            onClick={() => {
                              if(confirm("Remover privilégios de administrador?")) {
                                toggleAdmin.mutate({ userId: u.id, newRole: null });
                              }
                            }}
                          >
                            {u.email === 'wesleysemende@gmail.com' ? 'Admin Principal' : 'Revogar Acesso'}
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              if(confirm(`Promover ${u.username} a Administrador?`)) {
                                toggleAdmin.mutate({ userId: u.id, newRole: 'admin' });
                              }
                            }}
                          >
                            Promover a Admin
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            {isLoading ? (
              <p>A carregar dados seguros...</p>
            ) : reports && reports.length > 0 ? (
              reports.map((report: any) => (
                <Card key={report.id} className="p-6 border-l-4 border-l-red-600">
                   <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <Badge variant="destructive">{report.reason}</Badge>
                      <h3 className="font-bold text-xl">{report.house_title}</h3>
                      <p className="text-sm text-slate-500">Denunciante: {report.reporter_username}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => resolveReport.mutate(report.id)}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Ignorar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProperty.mutate({ propertyId: report.property_id, reportId: report.id })}>
                        <Trash2 className="w-4 h-4 mr-2" /> Banir
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-white border-2 border-dashed rounded-xl">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Sem ameaças pendentes.</h3>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}