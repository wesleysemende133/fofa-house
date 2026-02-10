import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Smile, Paperclip, FileText, X } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

export default function ChatWindow({ propertyId, otherUserId }: { propertyId: number; otherUserId: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        if (Number(payload.new.property_id) === Number(propertyId)) {
          setMessages(prev => [...prev, payload.new]);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [propertyId, otherUserId, user]);

  useEffect(() => { 
    // Scroll suave para a última mensagem
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, fileUrl?: string, fileName?: string) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !fileUrl || !user) return;

    const content = fileUrl ? fileName : newMessage;
    setNewMessage('');
    setShowEmojiPicker(false);

    const { error } = await supabase.from('messages').insert({
      content,
      property_id: propertyId,
      sender_id: user.id,
      receiver_id: otherUserId,
      file_url: fileUrl || null
    });

    if (error) console.error("Erro ao enviar:", error.message);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      await handleSend(undefined, publicUrl, file.name);
    } catch (error) {
      alert("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
  <div className="flex flex-col h-full bg-[#FFF5F0] relative overflow-hidden">
    {/* Área de Mensagens - Fluida e Elástica */}
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 relative z-10 scrollbar-hide">
      {messages.map((msg, i) => {
        const isMe = msg.sender_id === user?.id;
        const isImage = msg.file_url && /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.file_url);

        return (
          <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
            <div className={`
              relative 
              /* Ajuste de largura: 85% no iPhone 6s, 70% no Desktop */
              max-w-[85%] sm:max-w-[75%] md:max-w-[70%] 
              px-3 py-2 shadow-sm transition-all
              ${isMe 
                ? 'bg-orange-500 text-white rounded-[20px] rounded-tr-none ml-4' 
                : 'bg-white text-gray-800 rounded-[20px] rounded-tl-none mr-4 border border-orange-50'}
            `}>
              {msg.file_url ? (
                 <div className="py-1">
                   {isImage ? (
                     <img 
                      src={msg.file_url} 
                      className="max-w-full rounded-lg h-auto max-h-60 object-cover" 
                      onClick={() => window.open(msg.file_url, '_blank')} 
                     />
                   ) : (
                     <a href={msg.file_url} target="_blank" className="flex items-center gap-2 underline text-[14px]">
                       <FileText size={18} className="shrink-0" /> 
                       <span className="truncate block">{msg.content}</span>
                     </a>
                   )}
                 </div>
              ) : (
                /* break-words impede que textos longos sem espaço quebrem o layout */
                <span className="block leading-relaxed whitespace-pre-wrap text-[15px] md:text-[14px] break-words">
                  {msg.content}
                </span>
              )}
              
              <div className={`flex items-center justify-end mt-1 space-x-1 ${isMe ? 'text-orange-100/80' : 'text-gray-400'}`}>
                <span className="text-[10px] italic">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {isMe && <span className="text-[10px] font-bold">✓</span>}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={scrollRef} className="h-2" />
    </div>

    {/* Emoji Picker - Agora com largura adaptativa para o 6s */}
    {showEmojiPicker && (
      <div className="absolute bottom-[70px] left-0 right-0 z-50 flex justify-center px-2">
        <div className="w-full max-w-[340px] shadow-2xl scale-95 origin-bottom">
          <EmojiPicker 
            width="100%"
            height={320}
            onEmojiClick={(emojiData: EmojiClickData) => setNewMessage(prev => prev + emojiData.emoji)}
            previewConfig={{ showPreview: false }}
          />
        </div>
      </div>
    )}

    {/* Rodapé - Altura Dinâmica */}
    <form 
      onSubmit={handleSend} 
      className="p-2 md:p-3 bg-white border-t border-orange-100 flex items-center gap-1 sm:gap-2 relative z-20 pb-[safe-area-inset-bottom]"
    >
      <button 
        type="button" 
        onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
        className="p-1.5 text-gray-400 hover:text-orange-500 active:scale-90"
      >
        <Smile size={24} />
      </button>

      <label className="p-1.5 cursor-pointer text-gray-400 hover:text-orange-500 active:scale-90">
        <Paperclip size={24} />
        <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
      </label>

      <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-1 flex items-center border border-gray-100 focus-within:border-orange-200">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onFocus={() => setShowEmojiPicker(false)}
          placeholder={uploading ? "A enviar..." : "Mensagem..."}
          /* O segredo do 16px para evitar o zoom do iOS */
          className="flex-1 bg-transparent border-none text-[16px] py-2 outline-none text-gray-700 min-w-0"
          disabled={uploading}
        />
      </div>

      <button 
        type="submit" 
        disabled={uploading || (!newMessage.trim() && !uploading)}
        className="bg-orange-500 text-white p-2.5 rounded-full shadow-md active:scale-95 disabled:opacity-30 shrink-0"
      >
        <Send size={18} className="ml-0.5" />
      </button>
    </form>
  </div>
);
}