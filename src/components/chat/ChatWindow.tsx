import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

export default function ChatWindow({ propertyId, otherUserId }: { propertyId: number; otherUserId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens e ativar tempo real
  useEffect(() => {
    if (!user || !otherUserId || !propertyId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('property_id', propertyId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase.channel(`chat:${propertyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
      (payload) => {
        if (payload.new.property_id === propertyId) {
          setMessages(prev => [...prev, payload.new]);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [propertyId, otherUserId, user]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const content = newMessage;
    setNewMessage(''); // Limpa o campo imediatamente

    const { error } = await supabase.from('messages').insert({
      content,
      property_id: propertyId,
      sender_id: user.id,
      receiver_id: otherUserId
    });

    if (error) console.error("Erro ao enviar:", error.message);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${
              msg.sender_id === user?.id ? 'bg-orange-500 text-white' : 'bg-white border'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t flex gap-2 bg-white">
        <Input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escreva a sua mensagem..."
          className="flex-1"
        />
        <Button type="submit" size="icon" className="bg-orange-600">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}