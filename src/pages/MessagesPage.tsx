import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow'; // Novo componente
import { Link } from 'react-router-dom';

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
        .from('conversations_summary') // Usamos a view SQL que criamos
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar conversas:", error.message);
        return;
      }

      // Agrupar conversas por property_id
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

    // Opcional: Adicionar Realtime para novas conversas na sidebar
    // Isso seria mais complexo e pode ser adicionado depois se necessário.
    // Para esta versão, basta atualizar a página.

  }, [user]);

  const handleSelectChat = (propertyId: number, otherUserId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedOtherUserId(otherUserId);
  };

  const handleBackToProperties = () => {
    setSelectedPropertyId(null);
    setSelectedOtherUserId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR DE IMÓVEIS / USUÁRIOS */}
        <div className={`w-full md:w-1/3 border-r bg-white flex flex-col transition-all duration-300 ease-in-out 
                      ${selectedPropertyId && "hidden md:flex"}`} // Esconde no mobile se um chat estiver ativo
        >
          <div className="p-4 border-b font-bold text-xl text-primary flex items-center">
            {selectedPropertyId && (
              <Button variant="ghost" size="icon" onClick={handleBackToProperties} className="mr-2 md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {selectedPropertyId ? "Conversas sobre o imóvel" : "Meus Imóveis com Conversas"}
          </div>
          <ScrollArea className="flex-1">
            {!selectedPropertyId ? ( // Lista de Imóveis
              groupedConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhum imóvel com conversas ativas.
                </div>
              ) : (
                groupedConversations.map((propertyConv) => (
                  <div 
                    key={propertyConv.property_id}
                    onClick={() => setSelectedPropertyId(propertyConv.property_id)}
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <img 
                      src={propertyConv.property_image || 'https://via.placeholder.com/50'} 
                      alt={propertyConv.property_title} 
                      className="w-12 h-12 object-cover rounded-md" 
                    />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-semibold truncate">{propertyConv.property_title}</h4>
                      <p className="text-sm text-gray-500 truncate">
                        Conversas com {propertyConv.chats.length} pessoa(s)
                      </p>
                    </div>
                  </div>
                ))
              )
            ) : ( // Lista de Usuários para o imóvel selecionado
              groupedConversations.find(pc => pc.property_id === selectedPropertyId)?.chats.map(chat => (
                <div 
                  key={chat.other_user_id}
                  onClick={() => handleSelectChat(selectedPropertyId, chat.other_user_id)}
                  className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors 
                              ${selectedOtherUserId === chat.other_user_id ? 'bg-blue-50' : ''}`}
                >
                  <Avatar>
                    <AvatarImage src={chat.other_avatar_url} />
                    <AvatarFallback>{chat.other_username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <span className="font-semibold truncate">{chat.other_username}</span>
                    <p className="text-sm text-gray-500 truncate">{chat.last_message}</p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* ÁREA DO CHAT ATIVO */}
        <div className={`flex-1 flex flex-col ${selectedPropertyId && "w-full md:w-2/3"}`}>
          {(selectedPropertyId && selectedOtherUserId) ? (
            <ChatWindow 
              propertyId={selectedPropertyId} 
              otherUserId={selectedOtherUserId} 
            />
          ) : (
            <div className={`flex-1 flex items-center justify-center text-gray-400 
                            ${selectedPropertyId && "hidden md:flex"}`} // Esconde no mobile se um imóvel estiver selecionado
            >
              Selecione um imóvel e uma pessoa para conversar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
