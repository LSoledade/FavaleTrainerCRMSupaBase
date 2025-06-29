import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Lead, InsertLead, leadValidationSchema } from "@shared/schema";
import TagInput from "./TagInput";
import LeadStatusChangeNotification from "./LeadStatusChangeNotification";

interface LeadFormProps {
  lead?: Lead | null;
  onSubmit: (data: InsertLead) => void;
  onCancel: () => void;
}

export default function LeadForm({ lead, onSubmit, onCancel }: LeadFormProps) {
  const [tags, setTags] = useState<string[]>(lead?.tags || []);
  const [showStatusNotification, setShowStatusNotification] = useState(false);
  const originalStatus = useRef(lead?.status || "Lead");
  const formattedData = useRef<InsertLead | null>(null);
  
  // Função para lidar com o resultado da notificação
  const handleNotificationResult = (sendNotification: boolean, message?: string) => {
    setShowStatusNotification(false);
    if (formattedData.current) {
      onSubmit(formattedData.current);
      formattedData.current = null;
    }
  };
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setValue, 
    reset,
    control
  } = useForm<InsertLead>({
    resolver: zodResolver(leadValidationSchema),
    defaultValues: lead || {
      entryDate: new Date(),
      name: "",
      email: "",
      phone: "",
      state: "",
      campaign: "",
      tags: [],
      source: "",
      status: "Lead",
      notes: ""
    }
  });
  
  useEffect(() => {
    if (lead) {
      // Para edição, formatar a data no formato YYYY-MM-DD para o campo date
      const entryDate = lead.entryDate instanceof Date
        ? lead.entryDate
        : new Date(lead.entryDate);
        
      const formattedDate = entryDate.toISOString().split('T')[0];
      
      reset({
        ...lead,
        entryDate: formattedDate // Apenas para exibição no input type="date"
      } as any);
      setTags(lead.tags || []);
    } else {
      // Para novo lead, usar a data atual formatada
      const today = new Date().toISOString().split('T')[0];
      setValue('entryDate', today);
    }
  }, [lead, reset, setValue]);
  
  // Watch for status field changes
  const watchStatus = useWatch({
    control,
    name: "status",
    defaultValue: lead?.status || "Lead"
  });
  
  const onSubmitHandler = handleSubmit(data => {
    try {
      // Format the entry date
      let entryDate = new Date();
      
      if (data.entryDate) {
        if (data.entryDate instanceof Date) {
          entryDate = data.entryDate;
        } else if (typeof data.entryDate === 'string') {
          // Handle different date formats (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd)
          const dateParts = data.entryDate.split(/[\/\-]/);
          
          // Try to determine the format and create a valid Date
          if (dateParts.length === 3) {
            // If it's in yyyy-mm-dd format (from input type="date")
            if (dateParts[0].length === 4) {
              entryDate = new Date(data.entryDate);
            } 
            // If it's in dd/mm/yyyy format (common in Brazil)
            else if (dateParts[0].length === 2 && dateParts[1].length === 2) {
              entryDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
            } else {
              // Fallback to standard parsing
              entryDate = new Date(data.entryDate);
            }
          } else {
            // Fallback to standard parsing
            entryDate = new Date(data.entryDate);
          }
        }
      }
      
      // Validate that we got a valid date
      if (isNaN(entryDate.getTime())) {
        throw new Error('Data de entrada inválida');
      }
      
      const formData: InsertLead = {
        ...data,
        entryDate,
        tags
      };
      
      console.log('Submitting form data:', formData);
      // Enviar a data no formato ISO para evitar problemas com fusos horários
      const normalizedFormData = {
        ...formData,
        entryDate: formData.entryDate.toISOString(),
      };
      console.log('Normalized form data for submission:', normalizedFormData);
      
      // Check if status is changing from Lead to Aluno
      if (
        originalStatus.current === "Lead" && 
        data.status === "Aluno" &&
        lead?.id // Only existing leads with ID
      ) {
        // Store the formatted data and show notification dialog
        formattedData.current = normalizedFormData;
        setShowStatusNotification(true);
      } else {
        // Submit directly if no status change or not a lead->aluno transition
        onSubmit(normalizedFormData);
      }
    } catch (error) {
      console.error('Error formatting lead data:', error);
    }
  });
  
  // Handle tags updates
  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };
  
  return (
    <form onSubmit={onSubmitHandler} className="space-y-4 p-2">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">
          {lead ? `Editar Lead: ${lead.name}` : 'Novo Lead'}
        </h2>
      </div>
      
      {/* Nome */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Nome*</label>
        <input
          type="text"
          {...register("name")}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Nome completo"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>
      
      {/* Email */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          {...register("email")}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="email@exemplo.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>
      
      {/* Telefone */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Telefone*</label>
        <input
          type="text"
          {...register("phone")}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="(xx) xxxxx-xxxx"
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
        )}
      </div>
      
      {/* Estado */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Estado</label>
        <input
          type="text"
          {...register("state")}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="SP, RJ, MG, etc."
        />
        {errors.state && (
          <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
        )}
      </div>
      
      {/* Origem */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Origem</label>
        <select
          {...register("source")}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Selecione a origem</option>
          <option value="Instagram">Instagram</option>
          <option value="Facebook">Facebook</option>
          <option value="Google">Google</option>
          <option value="Indicação">Indicação</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Outro">Outro</option>
        </select>
        {errors.source && (
          <p className="mt-1 text-xs text-red-600">{errors.source.message}</p>
        )}
      </div>
      
      {/* Campanha */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Campanha</label>
        <input
          type="text"
          {...register("campaign")}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Nome da campanha"
        />
        {errors.campaign && (
          <p className="mt-1 text-xs text-red-600">{errors.campaign.message}</p>
        )}
      </div>
      
      {/* Data de entrada */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Data de entrada</label>
        <input
          type="date"
          {...register("entryDate")}
          className="w-full px-3 py-2 border rounded-md"
        />
        {errors.entryDate && (
          <p className="mt-1 text-xs text-red-600">{errors.entryDate.message}</p>
        )}
      </div>
      
      {/* Tags */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Tags</label>
        <TagInput tags={tags} onChange={handleTagsChange} />
      </div>
      
      {/* Status */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Status</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center">
            <input 
              type="radio" 
              value="Lead" 
              className="text-primary"
              {...register("status")}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Lead</span>
          </label>
          <label className="inline-flex items-center">
            <input 
              type="radio" 
              value="Aluno" 
              className="text-primary"
              {...register("status")}
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Aluno</span>
          </label>
        </div>
        {errors.status && (
          <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
        )}
      </div>
      
      {/* Observações */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea
          {...register("notes")}
          className="w-full px-3 py-2 border rounded-md"
          rows={4}
          placeholder="Observações adicionais sobre o lead"
        ></textarea>
        {errors.notes && (
          <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
        )}
      </div>
      
      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin inline-block mr-2">&#8987;</span>
              Salvando...
            </>
          ) : (
            <>Salvar</>
          )}
        </button>
      </div>
      
      {lead && showStatusNotification && (
        <LeadStatusChangeNotification
          lead={lead}
          isOpen={showStatusNotification}
          onClose={() => setShowStatusNotification(false)}
          onSubmitChange={handleNotificationResult}
        />
      )}
    </form>
  );
}