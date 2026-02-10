import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ChatWindow from '@/components/chat/ChatWindow';
import { Smile, ChevronLeft, MessageSquare } from 'lucide-react';

type Conversation = {
  property_id: number;
  property_title: string;
  property_image: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
};

type GroupedConversation = {
  property_id: number;
  property_title: string;
  property_image: string;
  chats: Conversation[];
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    searchParams.get('prop') ? Number(searchParams.get('prop')) : null
  );
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(
    searchParams.get('user')
  );

  // 1. Lógica para limpar notificações
  const markAsRead = async (otherId?: string) => {
    if (!user) return;

    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    // Se tivermos um ID de utilizador específico, limpamos apenas as notificações dele
    if (otherId) {
      query = query.ilike('link', `%user=${otherId}%`);
    }

    const { error } = await query;
    if (error) console.error('Erro ao limpar notificações:', error);
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchConversations = async () => {
      const { data, error } = await supabase.from('conversations_summary').select('*').order('property_id');
      if (error) return;
      
      const grouped = data.reduce((acc: Record<number, GroupedConversation>, curr: Conversation) => {
        if (!acc[curr.property_id]) {
          acc[curr.property_id] = {
            property_id: curr.property_id,
            property_title: curr.property_title,
            property_image: curr.property_image,
            chats: [],
          };
        }
        acc[curr.property_id].chats.push(curr);
        return acc;
      }, {});
      setGroupedConversations(Object.values(grouped));
    };

    fetchConversations();
    
    // Limpa todas as notificações ao entrar na página
    markAsRead();
  }, [user]);

  // 2. Limpar notificações específicas quando mudas de chat
  useEffect(() => {
    if (selectedOtherUserId) {
      markAsRead(selectedOtherUserId);
    }
  }, [selectedOtherUserId]);
  // Fecha o chat no mobile se o usuário usar o botão "Voltar" do navegador
  const handleBack = () => setSelectedOtherUserId(null);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-white overflow-hidden">
      {/* Header: Desaparece no mobile quando o chat está aberto para maximizar espaço */}
      <div className={`${selectedOtherUserId ? 'hidden md:block' : 'block'}`}>
        <Header />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ================= LISTA DE CONVERSAS (SIDEBAR) ================= */}
        <div className={`
          ${!selectedOtherUserId ? 'flex' : 'hidden'} 
          md:flex w-full md:w-[30%] lg:w-[25%] max-w-[400px] border-r flex flex-col bg-[#FDFCFB]
        `}>
          <div className="p-4 md:p-6 border-b bg-white flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800">Mensagens</h1>
            <MessageSquare className="text-orange-500 md:hidden" size={20} />
          </div>

          <ScrollArea className="flex-1">
            {groupedConversations.map((prop) => (
              <div key={prop.property_id} className="border-b border-gray-100">
                {/* Cabeçalho do Imóvel */}
                <div className="px-4 py-2 bg-orange-50/50 flex items-center gap-2 border-b border-orange-100/30">
                  <img src={prop.property_image} className="w-6 h-6 rounded object-cover shadow-sm" alt="" />
                  <span className="text-[11px] font-bold text-orange-700 uppercase tracking-tight truncate">
                    {prop.property_title}
                  </span>
                </div>

                {prop.chats.map((chat) => {
                  const active = selectedPropertyId === prop.property_id && selectedOtherUserId === chat.other_user_id;
                  return (
                    <div
                      key={chat.other_user_id}
                      onClick={() => {
                        setSelectedPropertyId(prop.property_id);
                        setSelectedOtherUserId(chat.other_user_id);
                      }}
                      className={`p-4 flex items-center gap-3 cursor-pointer transition-all active:bg-orange-100
                        ${active ? 'bg-orange-50 border-r-4 border-orange-500' : 'hover:bg-gray-50'}`}
                    >
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm shrink-0">
                        <AvatarImage src={chat.other_user_avatar || undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-600 font-bold uppercase">
                          {chat.other_user_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[15px] font-bold text-slate-900 truncate">
                            {chat.other_user_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 italic">
                          Clique para abrir a conversa
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* ================= JANELA DO CHAT (CONTEÚDO) ================= */}
        <div className={`
          ${selectedOtherUserId ? 'flex' : 'hidden'} 
          md:flex flex-1 flex-col bg-[#FAF5F2] relative
        `}>
          {selectedOtherUserId ? (
            <>
              {/* Top Bar Responsiva do Chat */}
              <div className="p-3 bg-white border-b flex items-center gap-3 z-30 shadow-sm safe-top">
                <button 
                  onClick={handleBack} 
                  className="md:hidden p-2 -ml-2 text-orange-600 active:bg-orange-50 rounded-full"
                >
                  <ChevronLeft size={28} strokeWidth={2.5} />
                </button>
                
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-orange-500 text-white font-bold">
                    {selectedOtherUserId[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">Chat Fofa House</p>
                  <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Online</p>
                </div>
              </div>

              {/* Componente do Chat */}
              <div className="flex-1 relative overflow-hidden">
                 <ChatWindow
                  propertyId={selectedPropertyId!}
                  otherUserId={selectedOtherUserId}
                />
              </div>
            </>
          ) : (
            /* Estado Vazio (Apenas Desktop) */
            <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Smile className="w-12 h-12 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Suas mensagens</h2>
              <p className="text-slate-500 mt-2 max-w-xs">
                Selecione uma conversa ao lado para começar a negociar seus imóveis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}