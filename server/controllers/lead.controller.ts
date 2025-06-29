import type { Request, Response } from "express";
import { storage } from "../storage";
import { leadValidationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { normalizePhone } from "../utils/lead.utils"; // Import the utility function
import { logAuditEvent, AuditEventType } from "../audit-log";

const BATCH_SIZE = 250; // Define batch size constant

// Importação em lote (batch) de leads
export const importLeadsBatch = async (req: Request, res: Response) => {
  try {
    console.log(`Recebendo solicitação de importação em lote de ${req.body.leads?.length || 0} leads`);
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: "Nenhum lead válido fornecido para importação" });
    }
    
    const existingLeads = await storage.getLeads();
    const phoneToLeadMap = new Map();
    
    existingLeads.forEach(lead => {
      if (lead.phone) {
        const normalized = normalizePhone(lead.phone);
        phoneToLeadMap.set(normalized, lead.id);
      }
    });
    
    const results = { 
      success: [] as any[],
      updated: [] as any[],
      errors: [] as any[]
    };
    
    const totalBatches = Math.ceil(leads.length / BATCH_SIZE);
    console.log(`Processando ${leads.length} leads em ${totalBatches} lotes de ${BATCH_SIZE}`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      console.log(`Enviando lote ${batchIndex + 1}/${totalBatches} (${Math.min(BATCH_SIZE, leads.length - batchIndex * BATCH_SIZE)} leads)`);
      
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min((batchIndex + 1) * BATCH_SIZE, leads.length);
      const currentBatch = leads.slice(startIdx, endIdx);
      
      for (let i = 0; i < currentBatch.length; i++) {
        const globalIndex = startIdx + i;
        try {
          let leadData = currentBatch[i];
          const normalizedCurrentPhone = normalizePhone(leadData.phone);
          
          if (normalizedCurrentPhone && phoneToLeadMap.has(normalizedCurrentPhone)) {
            const existingLeadId = phoneToLeadMap.get(normalizedCurrentPhone);
            const existingLead = existingLeads.find(l => l.id === existingLeadId);
            
            if (existingLead) {
              // Process tags before update check
              if (typeof leadData.tags === 'string') {
                leadData.tags = leadData.tags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean);
              } else if (!Array.isArray(leadData.tags)) {
                leadData.tags = [];
              }
              
              if (existingLead.tags && Array.isArray(existingLead.tags) && existingLead.tags.length > 0) {
                const combinedTags = Array.from(new Set([...existingLead.tags, ...leadData.tags]));
                leadData.tags = combinedTags.filter(tag => tag && tag.trim() !== '');
              }
              
              // Perform update
              console.log(`Atualizando lead ID ${existingLeadId} com novos dados`);
              await storage.updateLead(existingLeadId, leadData); // Use await here
              results.updated.push({
                index: globalIndex,
                id: existingLeadId,
                action: "atualizado",
                phone: leadData.phone
              });
              continue; // Move to next lead in batch
            } else {
               throw new Error(`Telefone ${leadData.phone} já existe, mas o lead correspondente (ID: ${existingLeadId}) não foi encontrado.`);
            }
          }
          
          // Process tags for new lead
          if (typeof leadData.tags === 'string') {
            leadData.tags = leadData.tags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean);
          } else if (!Array.isArray(leadData.tags)) {
            leadData.tags = [];
          }

          const validationResult = leadValidationSchema.safeParse(leadData);
          
          if (!validationResult.success) {
            const validationError = fromZodError(validationResult.error);
            throw new Error(`Erro de validação: ${validationError.message}`);
          }
          
          let validatedLead = validationResult.data;
          
          // Convert entryDate string to Date
          if (validatedLead.entryDate) {
             try {
                if (typeof validatedLead.entryDate === 'string') {
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(validatedLead.entryDate)) {
                    const [day, month, year] = validatedLead.entryDate.split('/');
                    validatedLead.entryDate = new Date(`${year}-${month}-${day}`);
                  } else {
                    validatedLead.entryDate = new Date(validatedLead.entryDate);
                  }
                  if (isNaN(validatedLead.entryDate.getTime())) {
                    console.warn(`Data inválida: ${validatedLead.entryDate}, usando data atual`);
                    validatedLead.entryDate = new Date(); 
                  }
                } else if (!(validatedLead.entryDate instanceof Date)) {
                  validatedLead.entryDate = new Date();
                }
              } catch (e) {
                console.error(`Erro ao converter data: ${validatedLead.entryDate}`, e);
                validatedLead.entryDate = new Date();
              }
          } else {
             validatedLead.entryDate = new Date();
          }

          const newLead = await storage.createLead(validatedLead);
          
          if (newLead.phone) {
            const normalizedNewPhone = normalizePhone(newLead.phone);
            phoneToLeadMap.set(normalizedNewPhone, newLead.id);
          }
          
          results.success.push({
            index: globalIndex,
            id: newLead.id,
            email: newLead.email
          });
        } catch (error) {
          console.error(`Erro ao processar lead #${globalIndex}:`, error);
          results.errors.push({
            index: globalIndex,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            data: currentBatch[i]
          });
        }
      }
    }
    
    logAuditEvent(AuditEventType.LEAD_BATCH_IMPORT, req, { 
      totalCount: leads.length,
      successCount: results.success.length,
      updatedCount: results.updated.length,
      errorCount: results.errors.length
    });
    
    console.log(`Importação em lote concluída: ${results.success.length} novos, ${results.updated.length} atualizados, ${results.errors.length} erros`);
    res.status(200).json({
      message: `Importação concluída. ${results.success.length} leads importados e ${results.updated.length} atualizados com sucesso. ${results.errors.length} erros.`, // Added error count to message
      totalProcessed: leads.length,
      successCount: results.success.length,
      updatedCount: results.updated.length,
      errorCount: results.errors.length,
      results
    });
  } catch (error) {
    console.error('Erro na importação em lote:', error);
    res.status(500).json({ message: "Falha na importação em lote", details: String(error) });
  }
};

// Atualização em lote de leads
export const updateLeadsBatch = async (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;
    console.log('Atualizando leads em lote:', { ids, updates });
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "IDs de leads são obrigatórios" });
    }
    
    const validationResult = leadValidationSchema.partial().safeParse(updates);
    
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      console.error('Erro de validação na atualização em lote:', validationError.message);
      return res.status(400).json({ message: validationError.message });
    }
    
    let dataToUpdate = validationResult.data;
    
    if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
      try {
        dataToUpdate = {
          ...dataToUpdate,
          entryDate: new Date(dataToUpdate.entryDate)
        };
      } catch (e) {
        console.error('Erro ao converter data:', e);
        return res.status(400).json({ message: "Formato de data inválido" });
      }
    }
    
    console.log('Dados para atualização em lote:', dataToUpdate);
    const count = await storage.updateLeadsInBatch(ids, dataToUpdate);
    
    logAuditEvent(AuditEventType.LEAD_BATCH_UPDATE, req, {
      leadIds: ids,
      updatedFields: Object.keys(dataToUpdate),
      updateCount: count,
      statusChange: dataToUpdate.status ? `Para ${dataToUpdate.status}` : undefined
    });
    
    res.json({ updatedCount: count });
  } catch (error) {
    console.error('Erro ao atualizar leads em lote:', error);
    res.status(500).json({ message: "Erro ao atualizar leads em lote", details: String(error) });
  }
};

// Exclusão em lote de leads
export const deleteLeadsBatch = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "IDs de leads são obrigatórios" });
    }
    
    const leadsInfo = await Promise.all(
      ids.map(async (id) => {
        try {
          return await storage.getLead(id);
        } catch (e) {
          return null;
        }
      })
    );
    
    const count = await storage.deleteLeadsInBatch(ids);
    
    logAuditEvent(AuditEventType.LEAD_BATCH_DELETE, req, {
      leadIds: ids,
      deleteCount: count,
      leadNames: leadsInfo.filter(Boolean).map(lead => lead?.name).join(', ')
    });
    
    res.json({ deletedCount: count });
  } catch (error) {
    console.error('Erro ao excluir leads em lote:', error);
    res.status(500).json({ message: "Erro ao excluir leads em lote" });
  }
};

// Obter todos os leads
export const getAllLeads = async (req: Request, res: Response) => {
  try {
    const leads = await storage.getLeads();
    res.json(leads);
  } catch (error) {
    console.error('Erro ao buscar leads:', error); // Added console log
    res.status(500).json({ message: "Erro ao buscar leads" });
  }
};

// Obter lead por ID
export const getLeadById = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) { // Validate ID is a number
       return res.status(400).json({ message: "ID do lead inválido" });
    }
    const lead = await storage.getLead(leadId);
    
    if (!lead) {
      return res.status(404).json({ message: "Lead não encontrado" });
    }
    
    res.json(lead);
  } catch (error) {
    console.error(`Erro ao buscar lead ${req.params.id}:`, error); // Added console log
    res.status(500).json({ message: "Erro ao buscar lead" });
  }
};

// Criar novo lead
export const createLead = async (req: Request, res: Response) => {
  try {
    console.log('Recebendo dados para criar lead:', req.body);
    const validationResult = leadValidationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      console.error('Erro de validação:', validationError.message);
      return res.status(400).json({ message: validationError.message });
    }
    
    console.log('Dados validados:', validationResult.data);
    
    let leadToInsert = {
      ...validationResult.data,
      entryDate: validationResult.data.entryDate instanceof Date 
        ? validationResult.data.entryDate 
        : new Date(validationResult.data.entryDate) // Ensure Date object
    };

    // Handle potential invalid date after conversion
    if (isNaN(leadToInsert.entryDate.getTime())) {
       console.warn('Data de entrada inválida, usando data atual:', req.body.entryDate);
       leadToInsert.entryDate = new Date();
    }
    
    console.log('Dados convertidos para inserção:', leadToInsert);
    const newLead = await storage.createLead(leadToInsert);
    
    logAuditEvent(AuditEventType.LEAD_CREATED, req, {
      leadId: newLead.id,
      name: newLead.name,
      source: newLead.source,
      status: newLead.status
    });
    
    res.status(201).json(newLead);
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ message: "Erro ao criar lead", details: String(error) });
  }
};

// Atualizar lead
export const updateLead = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
     if (isNaN(leadId)) { // Validate ID
       return res.status(400).json({ message: "ID do lead inválido" });
    }
    console.log('Atualizando lead:', req.body);
    
    const validationResult = leadValidationSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      const validationError = fromZodError(validationResult.error);
      console.error('Erro de validação na atualização:', validationError.message);
      return res.status(400).json({ message: validationError.message });
    }
    
    let dataToUpdate = validationResult.data;
    
    if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
      try {
         const parsedDate = new Date(dataToUpdate.entryDate);
         if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date format');
         }
        dataToUpdate = {
          ...dataToUpdate,
          entryDate: parsedDate
        };
      } catch (e) {
        console.error('Erro ao converter data:', e);
        return res.status(400).json({ message: "Formato de data inválido" });
      }
    }
    
    console.log('Dados para atualização:', dataToUpdate);
    const updatedLead = await storage.updateLead(leadId, dataToUpdate);
    
    if (!updatedLead) {
      return res.status(404).json({ message: "Lead não encontrado" });
    }
    
    // Get original lead data for status change logging
    const originalLead = await storage.getLead(leadId); // Assuming updateLead doesn't return the original

    logAuditEvent(AuditEventType.LEAD_UPDATED, req, {
      leadId: updatedLead.id,
      name: updatedLead.name,
      updatedFields: Object.keys(dataToUpdate),
      // Check if status was part of the update and if it changed
      statusChange: (dataToUpdate.status && originalLead && originalLead.status !== dataToUpdate.status) 
                     ? `De ${originalLead.status} para ${dataToUpdate.status}` 
                     : undefined
    });
    
    res.json(updatedLead);
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({ message: "Erro ao atualizar lead", details: String(error) });
  }
};

// Excluir lead
export const deleteLead = async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
     if (isNaN(leadId)) { // Validate ID
       return res.status(400).json({ message: "ID do lead inválido" });
    }
    
    const leadToDelete = await storage.getLead(leadId);
    
    if (!leadToDelete) {
      return res.status(404).json({ message: "Lead não encontrado" });
    }
    
    const success = await storage.deleteLead(leadId);
    
    // Log before checking success, as we have the lead info here
     logAuditEvent(AuditEventType.LEAD_DELETED, req, {
        leadId: leadId,
        name: leadToDelete.name,
        email: leadToDelete.email,
        source: leadToDelete.source,
        status: leadToDelete.status
      });

    if (!success) {
      // This case might be redundant if getLead already threw an error, 
      // but kept for safety in case deleteLead fails for other reasons.
      return res.status(404).json({ message: "Falha ao excluir lead, pode já ter sido excluído" }); 
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar lead:', error);
    res.status(500).json({ message: "Erro ao deletar lead" });
  }
}; 