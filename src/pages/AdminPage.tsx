import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, CheckCircle, Loader2, ShieldAlert, History, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
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

  // --- HELPER: Formatar Dinheiro ---
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  // --- HELPER: Registar Ação no Log ---
  const logAdminAction = async (action: string, targetId: string, details: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: user.email, 
        action,
        target_id: targetId,
        details
      });
    }
  };

  // --- SEGURANÇA: Verificação de Admin ---
  useEffect(() => {
    async function verifyAdmin() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Erro ao ler perfil:", profileError.message);
          return; 
        }

        if (profile?.role === 'admin') {
          setHasAccess(true);
        } else {
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
  }, [navigate, toast]);

  // --- QUERIES DE DADOS ---

  // 1. Logs de Auditoria
  const { data: auditLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: hasAccess,
  });

  // 2. Denúncias
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
    enabled: hasAccess,
  });

  // 3. Utilizadores
  const { data: users } = useQuery({
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

  // 4. Inventário Completo (Sem fotos para ser leve)
  const { data: allHouses, isLoading: loadingHouses } = useQuery({
    queryKey: ['admin-all-houses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('houses')
        .select(`
          id, title, price, city, status, created_at, is_premium,
          user_profiles (username, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: hasAccess,
  });

  // 5. Estatísticas
  const { data: housesCount } = useQuery({
    queryKey: ['admin-houses-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('houses').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess,
  });

  const { data: totalUsersCount } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess,
  });

  const { data: premiumCount } = useQuery({
    queryKey: ['admin-premium-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('houses').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      if (error) throw error;
      return count || 0;
    },
    enabled: hasAccess,
  });

  // --- FILTROS ---
  const admins = users?.filter(u => u.role === 'admin') || [];
  const regularUsers = users?.filter(u => u.role !== 'admin') || [];

  // --- MUTAÇÕES ---

  // Promover/Despromover Admin
  const toggleAdmin = useMutation({
    mutationFn: async ({ userId, newRole, username }: { userId: string, newRole: string | null, username: string }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (error) throw error;

      await logAdminAction(
        newRole === 'admin' ? 'PROMOTE_USER' : 'REVOKE_USER',
        userId,
        `Utilizador ${username} passou a ser ${newRole === 'admin' ? 'Admin' : 'User'}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
      toast({ title: "Permissões atualizadas!" });
    }
  });

  // Resolver Denúncia
  const resolveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
      if (error) throw error;
      await logAdminAction('RESOLVE_REPORT', id, 'Denúncia marcada como resolvida/ignorada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
      toast({ title: 'Resolvido com sucesso' });
    }
  });

  // Banir/Apagar Imóvel
  const deleteProperty = useMutation({
    mutationFn: async ({ propertyId, reportId }: { propertyId: string, reportId?: string }) => {
      // 1. Apagar imóvel
      const { error } = await supabase.from('houses').delete().eq('id', propertyId);
      if (error) throw error;

      // 2. Se houver denúncia associada, marcar como resolvida
      if (reportId) {
        await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);
      }

      await logAdminAction('DELETE_HOUSE', propertyId, 'Imóvel eliminado pelo administrador');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-houses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-houses-count'] });
      toast({ title: 'Imóvel eliminado' });
    }
  });

  if (isVerifying) return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="container mx-auto px-4 py-8 flex-1">
        
        {/* CABEÇALHO */}
        <div className="flex items-center gap-3 mb-8">
          <ShieldAlert className="text-primary w-8 h-8" />
          <h1 className="text-3xl font-bold">Painel de Controlo Master</h1>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-white shadow-sm border-t-4 border-t-blue-600">
            <div className="flex flex-col">
              <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total de Imóveis</span>
              <span className="text-3xl font-bold mt-1">{housesCount || 0}</span>
            </div>
          </Card>
          <Card className="p-6 bg-white shadow-sm border-t-4 border-t-purple-600">
            <div className="flex flex-col">
              <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Utilizadores</span>
              <span className="text-3xl font-bold mt-1">{totalUsersCount || 0}</span>
            </div>
          </Card>
          <Card className="p-6 bg-white shadow-sm border-t-4 border-t-amber-500">
            <div className="flex flex-col">
              <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Imóveis Premium</span>
              <span className="text-3xl font-bold mt-1">{premiumCount || 0}</span>
            </div>
          </Card>
          <Card className="p-6 bg-white shadow-sm border-t-4 border-t-red-500">
            <div className="flex flex-col">
              <span className="text-slate-500 text-sm font-medium uppercase tracking-wider">Denúncias Ativas</span>
              <span className="text-3xl font-bold mt-1 text-red-600">{reports?.length || 0}</span>
            </div>
          </Card>
        </div>

        {/* TABS PRINCIPAIS */}
        <Tabs defaultValue="inventory">
          <TabsList className="mb-6 w-full md:w-auto overflow-x-auto flex justify-start">
            <TabsTrigger value="inventory">Inventário ({allHouses?.length || 0})</TabsTrigger>
            <TabsTrigger value="reports">
               Denúncias ({reports?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
               <History className="w-4 h-4" /> Auditoria
            </TabsTrigger>
          </TabsList>

          {/* 1. ABA DE INVENTÁRIO (TABELA) */}
          <TabsContent value="inventory">
            <Card className="overflow-hidden border-0 shadow-md">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 text-slate-200 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="p-4">Título do Imóvel</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4">Localização</th>
                        <th className="p-4">Proprietário</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y bg-white text-slate-700">
                    {loadingHouses ? (
                        <tr><td colSpan={6} className="p-8 text-center">A carregar inventário...</td></tr>
                    ) : allHouses?.map((house: any) => (
                        <tr key={house.id} className="hover:bg-blue-50 transition-colors group">
                        <td className="p-4">
                            <div className="font-bold text-slate-900 truncate max-w-[200px]" title={house.title}>
                            {house.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex gap-2">
                            <span>{new Date(house.created_at).toLocaleDateString()}</span>
                            {house.is_premium && <Badge className="h-4 px-1 text-[10px] bg-amber-500">Premium</Badge>}
                            </div>
                        </td>
                        <td className="p-4 font-mono font-medium">
                            {formatMoney(house.price)}
                        </td>
                        <td className="p-4">
                            <Badge variant="outline" className="text-slate-500 border-slate-300">
                            {house.city}
                            </Badge>
                        </td>
                        <td className="p-4">
                            <div className="text-xs">
                            <p className="font-medium text-slate-900">{house.user_profiles?.username || 'Desconhecido'}</p>
                            <p className="text-slate-400">{house.user_profiles?.email}</p>
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${house.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            ${house.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${house.status === 'sold' ? 'bg-slate-100 text-slate-800' : ''}
                            `}>
                            {house.status === 'active' ? 'Ativo' : house.status === 'pending' ? 'Pendente' : house.status}
                            </span>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => window.open(`/property/${house.id}`, '_blank')}>
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    if(confirm('Tem a certeza que deseja apagar este imóvel permanentemente?')) {
                                        deleteProperty.mutate({ propertyId: house.id }); 
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
          </TabsContent>

          {/* 2. ABA DE DENÚNCIAS */}
          <TabsContent value="reports" className="space-y-4">
            {isLoading ? (
              <p>A carregar...</p>
            ) : reports && reports.length > 0 ? (
              reports.map((report: any) => (
                <Card key={report.id} className="p-6 border-l-4 border-l-red-600">
                   <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                    <div className="space-y-2">
                      <Badge variant="destructive">{report.reason}</Badge>
                      <h3 className="font-bold text-xl">{report.house_title}</h3>
                      <p className="text-sm text-slate-500">Denunciante: {report.reporter_username}</p>
                    </div>
                    <div className="flex gap-2">
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

          {/* 3. ABA DE UTILIZADORES */}
          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-lg">Administradores ({admins.length})</h2>
                </div>
                <Card className="divide-y overflow-hidden">
                  {admins.map((u: any) => (
                    <div key={u.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{u.username || 'Admin'}</span>
                        <span className="text-xs text-slate-500">{u.id.substring(0, 8)}...</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 text-xs text-red-600 border-red-100 hover:bg-red-50"
                        disabled={u.email === 'wesleysemende@gmail.com'}
                        onClick={() => {
                          if(confirm("Remover privilégios?")) toggleAdmin.mutate({ userId: u.id, newRole: null, username: u.username });
                        }}
                      >
                        {u.email === 'wesleysemende@gmail.com' ? 'Master' : 'Despromover'}
                      </Button>
                    </div>
                  ))}
                </Card>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CheckCircle className="w-5 h-5 text-slate-400" />
                  <h2 className="font-bold text-lg">Utilizadores ({regularUsers.length})</h2>
                </div>
                <Card className="divide-y overflow-hidden">
                  {regularUsers.map((u: any) => (
                    <div key={u.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{u.username || 'Utilizador'}</span>
                        <span className="text-xs text-slate-400">{u.id.substring(0, 8)}...</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          if(confirm(`Promover ${u.username}?`)) toggleAdmin.mutate({ userId: u.id, newRole: 'admin', username: u.username });
                        }}
                      >
                        Tornar Admin
                      </Button>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 4. ABA DE LOGS */}
          <TabsContent value="logs">
            <div className="flex justify-end mb-2">
                <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                </Button>
            </div>
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                    <tr>
                      <th className="p-4">Data/Hora</th>
                      <th className="p-4">Admin</th>
                      <th className="p-4">Ação</th>
                      <th className="p-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {auditLogs?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 font-medium text-slate-900">{log.admin_name}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
      <Footer />
    </div>
  );
}