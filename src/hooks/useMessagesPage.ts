import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// --- Tipos de Dados ---
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

export function useMessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // --- Estados ---
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(
    searchParams.get('prop') ? Number(searchParams.get('prop')) : null
  );
  
  const [selectedOtherUserId, setSelectedOtherUserId] = useState<string | null>(
    searchParams.get('user')
  );

  // --- Lógica para Limpar Notificações ---
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

  // --- Busca de Conversas (Effect) ---
  useEffect(() => {
    if (!user) return;
    
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations_summary')
        .select('*')
        .order('property_id');
        
      if (error) {
        console.error('Erro ao buscar conversas:', error);
        return;
      }
      
      // Agrupar conversas por imóvel
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
    markAsRead(); // Limpa notificações gerais ao entrar na página
  }, [user]);

  // --- Efeito: Limpar notificações específicas ao mudar de chat ---
  useEffect(() => {
    if (selectedOtherUserId) {
      markAsRead(selectedOtherUserId);
    }
  }, [selectedOtherUserId]);

  // --- Handlers ---
  const handleSelectChat = (propertyId: number, otherUserId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedOtherUserId(otherUserId);
  };

  const handleBack = () => {
    setSelectedOtherUserId(null);
    setSelectedPropertyId(null);
  };

  return {
    groupedConversations,
    selectedPropertyId,
    selectedOtherUserId,
    handleSelectChat,
    handleBack
  };
}