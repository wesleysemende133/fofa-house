import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

interface ChatWindowProps {
  propertyId: number;
  otherUserId: string;
}

export default function ChatWindow({ propertyId, otherUserId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [propertyTitle, setPropertyTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Carregar mensagens e informações do contato/imóvel
  useEffect(() => {
    if (!user || !propertyId || !otherUserId) return;

    const fetchChatData = async () => {
      // Buscar perfil do outro usuário
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('username, avatar_url')
        .eq('id', otherUserId)
        .single();
      if (profileData) setOtherUserProfile(profileData);

      // Buscar título do imóvel
      const { data: propertyData } = await supabase
        .from('houses')
        .select('title')
        .eq('id', propertyId)
        .single();
      if (propertyData) setPropertyTitle(propertyData.title);

      // Buscar histórico de mensagens
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*, sender:user_profiles!sender_id(username, avatar_url)')
        .eq('property_id', propertyId)
        .or(`sender_id.eq.${user.id},sender_id.eq.${otherUserId}`)
        .or(`receiver_id.eq.${user.id},receiver_id.eq.${otherUserId}`)
        .order('created_at', { ascending: true });
      if (messagesData) setMessages(messagesData);
    };

    fetchChatData();

    // 2. Escutar novas mensagens (Realtime)
    const channel = supabase
      .channel(`chat_${propertyId}_${user.id}_${otherUserId}`) // Canal único por conversa
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `property_id=eq.${propertyId}`
        },
        (payload) => {
          // Filtra para garantir que a mensagem é desta conversa
          const isRelevant = 
            (payload.new.sender_id === user.id && payload.new.receiver_id === otherUserId) ||
            (payload.new.sender_id === otherUserId && payload.new.receiver_id === user.id);

          if (isRelevant) {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, propertyId, otherUserId]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from('messages').insert({
      content: newMessage,
      sender_id: user.id,
      receiver_id: otherUserId,
      property_id: propertyId,
    });

    if (!error) setNewMessage('');
    else console.error("Erro ao enviar mensagem:", error.message);
  };

  if (!user) return <div className="p-4 text-center text-gray-500">Faça login para ver as mensagens.</div>;

  return (
    <div className="flex flex-col h-full">
      {/* HEADER DO CHAT */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={otherUserProfile?.avatar_url} />
            <AvatarFallback>{otherUserProfile?.username?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-semibold">{otherUserProfile?.username || 'Carregando...'}</span>
            <p className="text-sm text-gray-500 truncate">Sobre: <Link to={`/property/${propertyId}`} className="text-blue-600 hover:underline">{propertyTitle}</Link></p>
          </div>
        </div>
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-xs ${msg.sender_id === user.id ? 'bg-primary text-white' : 'bg-gray-200'}`}>
              <div className="text-xs text-gray-400 mb-1">{msg.sender?.username || 'Carregando...'}</div>
              {msg.content}
              <div className="text-[10px] text-right mt-1 text-gray-300">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* INPUT DE MENSAGEM */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
        <Input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreva sua mensagem..."
          className="flex-1"
        />
        <Button type="submit">Enviar</Button>
      </form>
    </div>
  );
}