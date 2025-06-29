import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Lead } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';

interface WhatsappConnectionStatus {
  status: 'connected' | 'disconnected' | 'checking' | 'error';
  message?: string;
  details?: {
    name?: string;
    phone?: string;
    quality?: string;
    [key: string]: any;
  };
}

interface WhatsappContextProps {
  isWhatsappOpen: boolean;
  selectedLeadForWhatsapp: Lead | null;
  openWhatsappChat: (lead: Lead) => void;
  closeWhatsappChat: () => void;
  connectionStatus: WhatsappConnectionStatus;
  refreshConnectionStatus: () => void;
}

const WhatsappContext = createContext<WhatsappContextProps | undefined>(undefined);

export function WhatsappProvider({ children }: { children: ReactNode }) {
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [selectedLeadForWhatsapp, setSelectedLeadForWhatsapp] = useState<Lead | null>(null);

  // Consulta do status da conexão WhatsApp
  const { data: statusData, refetch: refetchStatus, isLoading: isStatusLoading } = useQuery<{
    status: 'connected' | 'disconnected' | 'error';
    message: string;
    details?: {
      name?: string;
      phone?: string;
      quality?: string;
      [key: string]: any;
    };
  }>({
    queryKey: ['/api/whatsapp/status'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Verificar a cada minuto
  });

  // Definir o status da conexão com base na resposta da API
  const connectionStatus: WhatsappConnectionStatus = isStatusLoading
    ? { status: 'checking' }
    : statusData
      ? { 
          status: statusData.status, 
          message: statusData.message,
          details: statusData.details
        }
      : { status: 'error', message: 'Não foi possível verificar a conexão' };

  // Atualizar manualmente o status da conexão
  const refreshConnectionStatus = () => {
    refetchStatus();
  };

  const openWhatsappChat = (lead: Lead) => {
    setSelectedLeadForWhatsapp(lead);
    setIsWhatsappOpen(true);
  };

  const closeWhatsappChat = () => {
    setIsWhatsappOpen(false);
  };

  const value = {
    isWhatsappOpen,
    selectedLeadForWhatsapp,
    openWhatsappChat,
    closeWhatsappChat,
    connectionStatus,
    refreshConnectionStatus,
  };

  return <WhatsappContext.Provider value={value}>{children}</WhatsappContext.Provider>;
}

export function useWhatsappContext() {
  const context = useContext(WhatsappContext);
  if (context === undefined) {
    throw new Error('useWhatsappContext must be used within a WhatsappProvider');
  }
  return context;
}