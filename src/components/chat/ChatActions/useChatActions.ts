import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function useChatActions(propertyId: number, otherUserId: string) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const clearChat = async (callback: () => void) => {
    if (!confirm("Limpar todas as mensagens? Esta ação não pode ser desfeita.")) return;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('property_id', propertyId)
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`);

    if (!error) callback();
    else console.error("Erro ao limpar:", error);
  };

  const deleteChat = async () => {
    if (!confirm("Eliminar conversa permanent ساف permanentemente?")) return;
    
    // Aqui podes adicionar lógica extra se tiveres uma tabela de 'conversas'
    // Por agora, limpamos e voltamos atrás
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('property_id', propertyId)
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`);

    if (!error) navigate('/messages');
  };

  return { clearChat, deleteChat };
}