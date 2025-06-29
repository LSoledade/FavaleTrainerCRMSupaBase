import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lead } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Send, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WhatsappTemplateSelectorProps {
  lead: Lead;
  onSuccess?: () => void;
}

// Tipos de template disponíveis conforme documentação
interface Template {
  id: string;
  name: string;
  description: string;
  category?: string;
}

// Utilizamos apenas templates pré-aprovados pela Meta
const availableTemplates: Template[] = [
  {
    id: 'hello_world',
    name: 'Boas-vindas',
    description: 'Mensagem de boas-vindas para novos leads',
    category: 'MARKETING'
  },
  {
    id: 'welcome_personal_training',
    name: 'Boas-vindas Treinamento',
    description: 'Mensagem de boas-vindas específica para treinamento pessoal',
    category: 'MARKETING'
  },
  {
    id: 'special_offer',
    name: 'Oferta Especial',
    description: 'Informar sobre promoção ou pacote especial',
    category: 'MARKETING'
  },
  {
    id: 'workout_plan',
    name: 'Plano de Treino',
    description: 'Confirmação de envio do plano de treino personalizado',
    category: 'UTILITY'
  },
  {
    id: 'agendamento_confirmado',
    name: 'Confirmação de Agendamento',
    description: 'Confirmar um agendamento de sessão de treinamento',
    category: 'UTILITY'
  },
  {
    id: 'lembrete_sessao',
    name: 'Lembrete de Sessão',
    description: 'Lembrar o cliente sobre uma sessão agendada',
    category: 'UTILITY'
  },
  {
    id: 'nutritional_plan',
    name: 'Plano Nutricional',
    description: 'Confirmação de envio do plano nutricional',
    category: 'UTILITY'
  },
  {
    id: 'progress_update',
    name: 'Atualização de Progresso',
    description: 'Solicitar atualização de progresso do aluno',
    category: 'UTILITY'
  }
];

const WhatsappTemplateSelector = ({ lead, onSuccess }: WhatsappTemplateSelectorProps) => {
  const [templateId, setTemplateId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutação para enviar template
  const sendTemplateMutation = useMutation({
    mutationFn: async (template: string) => {
      return apiRequest('POST', '/api/whatsapp/template', {
        leadId: lead.id,
        templateName: template,
        language: 'pt_BR'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] });
      toast({
        title: 'Sucesso',
        description: 'Template enviado com sucesso',
      });
      if (onSuccess) onSuccess();
      setIsOpen(false);
    },
    onError: (error: any) => {
      console.error('Erro ao enviar template:', error);
      
      let errorMessage = 'Não foi possível enviar o template';
      
      // Verificar se é um erro específico de número não autorizado
      if (error?.response?.data?.isUnauthorizedNumber) {
        errorMessage = `Número ${lead.phone} não autorizado. Apenas números verificados podem receber mensagens no ambiente de teste.`;
      } else if (error?.response?.data?.error) {
        // Usar mensagem de erro da API quando disponível
        errorMessage = error.response.data.error;
      }
      
      // Verificar se o erro menciona template não encontrado
      if (errorMessage.toLowerCase().includes('template não encontrado') ||
          errorMessage.toLowerCase().includes('template not found')) {
        errorMessage = `Template "${availableTemplates.find(t => t.id === templateId)?.name || templateId}" não encontrado na plataforma Meta. Verifique se o template foi aprovado.`;
      }
      
      toast({
        title: 'Erro no envio do template',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const handleSendTemplate = () => {
    if (templateId) {
      sendTemplateMutation.mutate(templateId);
    }
  };

  const getAvailableTemplatesByCategory = (category: string) => {
    return availableTemplates.filter(template => template.category === category);
  };

  const marketingTemplates = getAvailableTemplatesByCategory('MARKETING');
  const utilityTemplates = getAvailableTemplatesByCategory('UTILITY');
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost"
          size="sm"
          className="flex items-center gap-1 h-8 text-xs"
        >
          <Send size={14} />
          <span>Templates</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Template</DialogTitle>
          <DialogDescription>
            Selecione um template pré-aprovado para enviar para {lead.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um template" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Marketing</SelectLabel>
                {marketingTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Utilitários</SelectLabel>
                {utilityTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {templateId && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <h4 className="text-sm font-medium mb-1">
                {availableTemplates.find(t => t.id === templateId)?.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {availableTemplates.find(t => t.id === templateId)?.description}
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleSendTemplate} 
            disabled={!templateId || sendTemplateMutation.isPending}
            size="sm"
          >
            {sendTemplateMutation.isPending ? 'Enviando...' : 'Enviar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsappTemplateSelector;