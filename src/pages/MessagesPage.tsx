import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ChatWindow from '@/components/chat/ChatWindow';

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

  /* =========================
     BUSCAR CONVERSAS
  ========================== */
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations_summary')
        .select('*')
        .order('property_id');

      if (error) {
        console.error(error);
        return;
      }

      if (!data) return;

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
  }, [user]);

  /* =========================
     AUTO ABRIR PRIMEIRA CONVERSA
  ========================== */
  useEffect(() => {
    if (
      !selectedPropertyId &&
      !selectedOtherUserId &&
      groupedConversations.length > 0
    ) {
      const first = groupedConversations[0];
      setSelectedPropertyId(first.property_id);
      setSelectedOtherUserId(first.chats[0].other_user_id);
    }
  }, [groupedConversations, selectedPropertyId, selectedOtherUserId]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* ================= SIDEBAR ================= */}
        <div className="w-80 border-r flex flex-col bg-white">
          <div className="p-4 border-b font-bold">Conversas</div>

          <ScrollArea className="flex-1">
            {groupedConversations.map((prop) => (
              <div key={prop.property_id}>
                {/* Imóvel */}
                <div className="p-3 flex items-center gap-3 bg-gray-100 border-b">
                  <img
                    src={prop.property_image}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <span className="font-semibold truncate">
                    {prop.property_title}
                  </span>
                </div>

                {/* Usuários */}
                {prop.chats.map((chat) => {
                  const active =
                    selectedPropertyId === prop.property_id &&
                    selectedOtherUserId === chat.other_user_id;

                  return (
                    <div
                      key={chat.other_user_id}
                      onClick={() => {
                        setSelectedPropertyId(prop.property_id);
                        setSelectedOtherUserId(chat.other_user_id);
                      }}
                      className={`p-4 flex items-center gap-3 cursor-pointer border-b
                        ${active ? 'bg-gray-200' : 'hover:bg-gray-50'}
                      `}
                    >
                      <Avatar>
                        <AvatarImage src={chat.other_user_avatar || undefined} />
                        <AvatarFallback>
                          {chat.other_user_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 truncate font-medium">
                        {chat.other_user_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* ================= CHAT ================= */}
        <div className="flex-1 flex flex-col">
          {selectedPropertyId && selectedOtherUserId ? (
            <ChatWindow
              propertyId={selectedPropertyId}
              otherUserId={selectedOtherUserId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Selecione uma conversa para começar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
