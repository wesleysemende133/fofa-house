import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Bell } from 'lucide-react';

export function NotificationBadge() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Busca inicial de notificações não lidas
    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error) setUnreadCount(count || 0);
    };

    fetchUnreadCount();

    // 2. Lógica de Escuta Realtime
    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Incrementa o contador visual
          setUnreadCount((prev) => prev + 1);
          
          // Dispara o alerta visual (Toast) em qualquer página
          toast.success(payload.new.content, {
            icon: '🔔',
            duration: 5000,
          });

          // Opcional: Feedback sonoro ou vibração para mobile
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Se não houver notificações, o componente não renderiza nada visualmente
  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}