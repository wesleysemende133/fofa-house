import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface ChatWindowProps {
  propertyId: number;
  otherUserId: string;
}

export default function ChatWindow({ propertyId, otherUserId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Carregar dados iniciais
  useEffect(() => {
    if (!user || !propertyId || !otherUserId) return;

    const loadData = async () => {
      // Perfil do outro utilizador
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', otherUserId).single();
      if (profile) setOtherUser(profile);

      // Histórico de Mensagens
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('property_id', propertyId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      
      if (msgs) setMessages(msgs);
    };

    loadData();

    // 2. Ligar o Realtime (Ouvido Aberto)
    const channel = supabase.channel(`chat_room_${propertyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `property_id=eq.${propertyId}` },
        (payload) => {
          const newMsg = payload.new;
          // Só adiciona se a mensagem for relevante para ESTA conversa e se eu não for o remetente (para evitar duplicar com a otimista)
          if (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id) {
             setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, propertyId, otherUserId]);

  // Scroll automático
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // 3. Enviar Mensagem
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage;
    setNewMessage(''); // Limpa o input imediatamente

    // Criação de mensagem temporária para aparecer logo na tela (Optimistic UI)
    const optimisticMsg = {
      id: Date.now(), // ID temporário
      content,
      sender_id: user.id,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    // Envio real para o Supabase
    const { error } = await supabase.from('messages').insert({
      content,
      sender_id: user.id,
      receiver_id: otherUserId,
      property_id: propertyId
    });

    if (error) {
      console.error('Erro ao enviar:', error);
      // Aqui poderias remover a mensagem da lista se falhar, mas para já deixamos assim
    }
  };

  if (!otherUser) return <div className="p-4">Carregando conversa...</div>;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Topo */}
      <div className="p-3 border-b flex items-center gap-3 bg-white shrink-0">
        <Avatar>
            <AvatarImage src={otherUser.avatar_url} />
            <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
        </Avatar>
        <span className="font-bold">{otherUser.username}</span>
      </div>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-[75%] text-sm ${
                isMine ? 'bg-primary text-white rounded-br-none' : 'bg-white border rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t bg-white flex gap-2 shrink-0">
        <Input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          placeholder="Digite uma mensagem..." 
          className="flex-1"
        />
        <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}