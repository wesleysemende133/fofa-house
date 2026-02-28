import { MoreVertical, Eraser, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useChatActions } from './useChatActions';

interface ChatActionsProps {
  propertyId: number;
  otherUserId: string;
  onMessagesCleared: () => void;
}

export default function ChatActions({ propertyId, otherUserId, onMessagesCleared }: ChatActionsProps) {
  const { clearChat, deleteChat } = useChatActions(propertyId, otherUserId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="p-2 hover:bg-orange-50 rounded-full transition-colors outline-none">
        <MoreVertical size={20} className="text-gray-500" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-52 p-2">
        <DropdownMenuItem 
          onClick={() => clearChat(onMessagesCleared)}
          className="flex items-center gap-2 p-3 cursor-pointer focus:bg-orange-50 rounded-md"
        >
          <Eraser size={16} className="text-gray-400" />
          <span className="text-sm font-medium">Limpar conversa</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={deleteChat}
          className="flex items-center gap-2 p-3 cursor-pointer focus:bg-red-50 text-red-600 rounded-md"
        >
          <Trash2 size={16} />
          <span className="text-sm font-medium">Eliminar chat</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}