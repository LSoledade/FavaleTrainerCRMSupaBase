import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WhatsappButtonProps {
  onClick: () => void;
  className?: string;
}

const WhatsappButton = ({ onClick, className = '' }: WhatsappButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors ${className}`}
            aria-label="Abrir WhatsApp"
          >
            <MessageCircle size={18} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Abrir WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WhatsappButton;