import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare, ArrowLeftCircle } from 'lucide-react'; // Ícones adicionados
import ChatWindow from '@/components/chat/ChatWindow';

interface ConversationSummary {
  property_id: number;
  property_title: string;
  property_image: string;
  other_user_id: string;
  other_username: string;
  other_avatar_url: string;
  last_message: string;
  last_message_at: string;
}

interface GroupedConversation {
  property_id: number;
  property_title: string;
  property_image: string;
  chats: ConversationSummary[];
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations_summary')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar conversas:", error.message);
        return;
      }

      const grouped = data?.reduce((acc: { [key: number]: GroupedConversation }, current: ConversationSummary) => {
        if (!acc[current.property_id]) {
          acc[current.property_id] = {
            property_id: current.property_id,
            property_title: current.property_title,
            property_image: current.property_image,
            chats: []
          };
        }
        acc[current.property_id].chats.push(current);
        return acc;
      }, {});

      setGroupedConversations(Object.values(grouped || {}));
    };

    fetchConversations();
  }, [user]);

  const handleSelectChat = (propertyId: number, otherUserId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedOtherUserId(otherUserId);
  };

  const handleBackToProperties = () => {
    setSelectedPropertyId(null);
    setSelectedOtherUserId(null);
  };

  // Botão "Voltar" específico para quando estamos dentro do chat no mobile
  const handleBackFromChatMobile = () => {
    setSelectedOtherUserId(null);
    // Não limpamos o propertyId para voltar à lista de usuários do imóvel, não aos imóveis todos
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header />
      
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR: Lista de Imóveis ou Usuários */}
        {/* Lógica CSS: No mobile, esconde a sidebar se um chat estiver aberto */}
        <div className={`w-full md:w-1/3 border-r bg-white flex flex-col h-full transition-all 
          ${(selectedPropertyId && selectedOtherUserId) ? 'hidden md:flex' : 'flex'}`}
        >
          {/* Cabeçalho da Sidebar */}
          <div className="p-4 border-b font-bold text-lg text-gray-800 flex items-center bg-gray-50/50">
            {selectedPropertyId && (
              <Button variant="ghost" size="icon" onClick={handleBackToProperties} className="mr-2 h-8 w-8">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <span className="truncate">
              {selectedPropertyId ? "Selecionar Pessoa" : "Minhas Conversas"}
            </span>
          </div>

          <ScrollArea className="flex-1">
            {!selectedPropertyId ? (
              // 1. LISTA DE IMÓVEIS
              groupedConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                  <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
                  <p>Nenhuma conversa iniciada.</p>
                </div>
              ) : (
                groupedConversations.map((prop) => (
                  <div 
                    key={`prop-${prop.property_id}`}
                    onClick={() => setSelectedPropertyId(prop.property_id)}
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 border-b border-gray-50 transition-colors"
                  >
                    <img 
                      src={prop.property_image || 'https://placehold.co/100?text=Casa'} 
                      alt={prop.property_title} 
                      className="w-12 h-12 object-cover rounded-lg border" 
                    />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold text-gray-900 truncate">{prop.property_title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {prop.chats.length} conversa{prop.chats.length !== 1 && 's'}
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : (
              // 2. LISTA DE PESSOAS (dentro de um imóvel)
              groupedConversations
                .find(p => p.property_id === selectedPropertyId)
                ?.chats.map((chat) => (
                <div 
                  key={`chat-${chat.property_id}-${chat.other_user_id}`}
                  onClick={() => handleSelectChat(chat.property_id, chat.other_user_id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 border-b border-gray-50 transition-colors
                    ${selectedOtherUserId === chat.other_user_id ? 'bg-blue-50 border-l-4 border-l-primary' : ''}`}
                >
                  <Avatar>
                    <AvatarImage src={chat.other_avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {chat.other_username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">{chat.other_username}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(chat.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {chat.last_message || 'Inicie a conversa...'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* ÁREA DO CHAT (Direita) */}
        {/* Lógica CSS: No mobile, ocupa a tela toda se tiver chat selecionado. No Desktop, sempre visível (flex-1) */}
        <div className={`flex-1 flex flex-col h-full bg-white relative 
          ${(!selectedPropertyId || !selectedOtherUserId) ? 'hidden md:flex' : 'flex'}`}
        >
          {selectedPropertyId && selectedOtherUserId ? (
            <div className="flex flex-col h-full w-full relative">
              
              {/* Botão Voltar (Aparece SÓ no mobile, flutuando ou no topo) */}
              <div className="md:hidden absolute top-3 left-2 z-50">
                <Button variant="ghost" size="icon" onClick={handleBackFromChatMobile} className="bg-white/80 backdrop-blur shadow-sm rounded-full h-8 w-8">
                  <ArrowLeftCircle className="h-6 w-6 text-primary" />
                </Button>
              </div>

              {/* O COMPONENTE DE CHAT QUE CORRIGIMOS ANTES */}
              <ChatWindow 
                propertyId={selectedPropertyId} 
                otherUserId={selectedOtherUserId} 
              />
            </div>
          ) : (
            // EMPTY STATE (Quando nenhuma conversa está selecionada no Desktop)
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/30">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <MessageSquare className="w-16 h-16 opacity-20 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700">Suas Mensagens</h3>
              <p className="max-w-xs mt-2 text-sm">
                Selecione um imóvel e uma pessoa na lista ao lado para ver o histórico e trocar mensagens.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}