import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lead, InsertLead } from "@shared/schema";
import { useLeadContext } from "@/context/LeadContext";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import LeadTable from "./LeadTable";
import LeadDialog from "./LeadDialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LeadManagement() {
  const queryClient = useQueryClient();
  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;

  const { 
    setIsDialogOpen, 
    selectedLead, 
    setSelectedLead,
    deleteLead,
    createLead,
    selectedLeadIds,
    setSelectedLeadIds,
    updateLeadsInBatch,
    deleteLeadsInBatch
  } = useLeadContext();
  
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  type FilterState = {
    source: string;
    status: string;
    campaign: string;
    state: string;
    startDate: string;
    endDate: string;
    tag: string;
    dateRange: string;
  };

  const [filters, setFilters] = useState<FilterState>({
    source: "",
    status: "",
    campaign: "",
    state: "",
    startDate: "",
    endDate: "",
    tag: "",
    dateRange: ""
  });
  
  // Função que retorna todas as tags únicas dos leads
  const getUniqueTags = () => {
    if (!leads) return [];
    
    // Obter todas as tags
    const allTags = leads.flatMap(lead => lead.tags || []);
    
    // Criar um objeto para rastrear tags únicas
    const uniqueTagsObj: Record<string, boolean> = {};
    allTags.forEach(tag => {
      if (tag.trim() !== "") {
        uniqueTagsObj[tag] = true;
      }
    });
    
    // Converter de volta para array e ordenar
    return Object.keys(uniqueTagsObj).sort();
  };
  
  // Função para configurar data inicial e final com base no período selecionado
  const handleDateRangeChange = (range: string) => {
    const today = new Date();
    let startDate = "";
    let endDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    switch(range) {
      case "today":
        startDate = today.toISOString().split('T')[0];
        break;
      case "last7days":
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        startDate = last7Days.toISOString().split('T')[0];
        break;
      case "last30days":
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        startDate = last30Days.toISOString().split('T')[0];
        break;
      case "thisMonth":
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = thisMonth.toISOString().split('T')[0];
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastDayLastMonth.toISOString().split('T')[0];
        break;
      case "thisYear":
        const thisYear = new Date(today.getFullYear(), 0, 1);
        startDate = thisYear.toISOString().split('T')[0];
        break;
      case "custom":
        // Mantém as datas atuais para entrada manual
        return;
      default:
        // Limpa as datas
        startDate = "";
        endDate = "";
    }
    
    setFilters(prev => ({ ...prev, startDate, endDate, dateRange: range }));
  };
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchStatusValue, setBatchStatusValue] = useState("");
  const [batchSourceValue, setBatchSourceValue] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "excel">("csv");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const csvLinkRef = useRef<HTMLAnchorElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<InsertLead[]>([]);
  const [importStats, setImportStats] = useState<{
    currentBatch: number;
    totalBatches: number; 
    processedCount: number;
    successCount: number;
    errorCount: number;
    updatedCount: number;
    totalCount: number;
    currentBatchSize: number;
    statusMessage: string;
    batchResults: Array<{
      batch: number;
      success: number;
      updated: number;
      errors: number;
    }>;
  }>({
    currentBatch: 0,
    totalBatches: 0,
    processedCount: 0,
    successCount: 0,
    errorCount: 0,
    updatedCount: 0,
    totalCount: 0,
    currentBatchSize: 0,
    statusMessage: 'Aguardando início da importação',
    batchResults: []
  });

  // Parse CSV content and extract lead data
  const parseCSV = (content: string) => {
    const rows = content.split('\n');
    
    if (rows.length < 2) {
      throw new Error("O arquivo não contém dados válidos.");
    }
    
    // Extract headers and normalize them
    const headers = rows[0]
      .split(',')
      .map(header => header.trim().toLowerCase());
    
    const requiredHeaders = ['nome', 'email'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
      throw new Error(`O arquivo não contém os cabeçalhos obrigatórios: ${missingHeaders.join(', ')}.`);
    }
    
    // Process each row
    const leadsToImport: InsertLead[] = [];
    const errorRows: number[] = [];
    const parsedRows: any[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const values = rows[i].split(',');
      if (values.length !== headers.length) {
        errorRows.push(i);
        continue;
      }
      
      // Create lead object from CSV row
      try {
        const leadData: Record<string, any> = {};
        const rowData: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || "";
          rowData[header] = value;
          
          switch(header) {
            case 'nome':
            case 'name':
              leadData.name = value;
              break;
            case 'email':
              leadData.email = value;
              break;
            case 'telefone':
            case 'phone':
              leadData.phone = value;
              break;
            case 'estado':
            case 'state':
              leadData.state = value;
              break;
            case 'campanha':
            case 'campaign':
              leadData.campaign = value;
              break;
            case 'origem':
            case 'fonte':
            case 'source':
              leadData.source = value;
              break;
            case 'status':
              leadData.status = value || "Lead";
              break;
            case 'tags':
              leadData.tags = value ? value.split(/[,;]/).map(tag => tag.trim()) : [];
              break;
            case 'data_entrada':
            case 'data de entrada':
              try {
                leadData.entryDate = value ? new Date(value).toISOString() : new Date().toISOString();
              } catch (e) {
                leadData.entryDate = new Date().toISOString();
              }
              break;
            case 'observacoes':
            case 'observações':
              leadData.notes = value;
              break;
          }
        });
        
        // Validate required fields
        if (!leadData.name || !leadData.email) {
          errorRows.push(i);
          continue;
        }
        
        // Set defaults for missing fields
        if (!leadData.status) leadData.status = "Lead";
        if (!leadData.source) leadData.source = "Favale";
        if (!leadData.tags) leadData.tags = [];
        if (!leadData.entryDate) leadData.entryDate = new Date().toISOString();
        
        leadsToImport.push(leadData as InsertLead);
        parsedRows.push(rowData);
      } catch (error) {
        console.error(`Erro ao processar linha ${i}:`, error);
        errorRows.push(i);
      }
    }
    
    if (leadsToImport.length === 0) {
      throw new Error("Nenhum lead válido encontrado no arquivo.");
    }
    
    return { leadsToImport, errorRows, parsedRows };
  };
  
  const handleNewLead = () => {
    setSelectedLead(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedLead) {
      await deleteLead(selectedLead.id);
      setDeleteDialogOpen(false);
    }
  };

  const handleBatchStatusUpdate = async () => {
    if (selectedLeadIds.length > 0 && batchStatusValue) {
      await updateLeadsInBatch(selectedLeadIds, { status: batchStatusValue });
      setBatchStatusValue("");
    }
  };

  const handleBatchSourceUpdate = async () => {
    if (selectedLeadIds.length > 0 && batchSourceValue) {
      await updateLeadsInBatch(selectedLeadIds, { source: batchSourceValue });
      setBatchSourceValue("");
    }
  };

  const handleBatchDelete = () => {
    if (selectedLeadIds.length > 0) {
      setBatchDeleteDialogOpen(true);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedLeadIds.length > 0) {
      await deleteLeadsInBatch(selectedLeadIds);
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        
        // Pré-processamento para garantir quebras de linha consistentes (CRLF -> LF)
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rows = normalizedContent.split('\n');
        
        console.log(`Total de linhas no arquivo: ${rows.length}`);
        
        if (rows.length < 2) {
          toast({
            title: "Erro na importação",
            description: "O arquivo não contém dados válidos.",
            variant: "destructive",
          });
          return;
        }
        
        // Extrair cabeçalhos com tratamento especial para vírgulas em aspas
        let headerRow = rows[0];
        const headerValues: string[] = [];
        let insideHeaderQuotes = false;
        let currentHeader = "";
        
        for (let j = 0; j < headerRow.length; j++) {
          const char = headerRow[j];
          
          if (char === '"') {
            insideHeaderQuotes = !insideHeaderQuotes;
          } else if (char === ',' && !insideHeaderQuotes) {
            headerValues.push(currentHeader.trim().toLowerCase());
            currentHeader = "";
          } else {
            currentHeader += char;
          }
        }
        
        // Adicionar o último cabeçalho
        headerValues.push(currentHeader.trim().toLowerCase());
        
        // Limpar aspas nos cabeçalhos
        const headers = headerValues.map(header => {
          let cleaned = header.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.substring(1, cleaned.length - 1);
          }
          return cleaned;
        });
        
        console.log('Cabeçalhos encontrados:', headers);
        
        // Map para normalização de cabeçalhos
        const headerMap: Record<string, string[]> = {
          'nome': ['nome', 'name', 'Nome'],
          'email': ['email', 'Email'],
          'telefone': ['telefone', 'phone', 'Telefone'],
          'estado': ['estado', 'state', 'Estado'],
          'status': ['status', 'Status'],
          'fonte': ['fonte', 'source', 'origem', 'Fonte'],
          'campanha': ['campanha', 'campaign', 'Campanha'],
          'tags': ['tags', 'Tags'],
          'data_entrada': ['data_entrada', 'data de entrada', 'data', 'Data de Entrada'],
          'observacoes': ['observacoes', 'observações', 'notas', 'notes', 'Observações']
        };
        
        // Verificar se os cabeçalhos necessários estão presentes usando o mapa
        const requiredFields = ['nome', 'email'];
        const missingHeaders = [];
        
        for (const required of requiredFields) {
          const possibleHeaders = headerMap[required];
          if (!possibleHeaders.some(h => headers.includes(h))) {
            missingHeaders.push(required);
          }
        }
        
        if (missingHeaders.length > 0) {
          toast({
            title: "Erro na importação",
            description: `O arquivo não contém os cabeçalhos obrigatórios: ${missingHeaders.join(', ')}.`,
            variant: "destructive",
          });
          return;
        }
        
        // Process each row
        const leadsToImport: InsertLead[] = [];
        const errorRows: number[] = [];
        
        // Iniciar da linha 1 (após o cabeçalho)
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i] || !rows[i].trim()) continue;
          
          // Process each row - tratamento especial para campos com vírgulas dentro de aspas
          const row = rows[i];
          const values: string[] = [];
          let insideQuotes = false;
          let currentValue = "";
          
          for (let j = 0; j < row.length; j++) {
            const char = row[j];
            
            if (char === '"') {
              insideQuotes = !insideQuotes;
              // Mantém aspas apenas para processamento posterior
              currentValue += char;
            } else if (char === ',' && !insideQuotes) {
              values.push(currentValue);
              currentValue = "";
            } else {
              currentValue += char;
            }
          }
          
          // Adicionar o último valor
          values.push(currentValue);
          
          // Limpar aspas externas e espaços em branco
          const cleanValues = values.map(val => {
            let cleaned = val.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
              cleaned = cleaned.substring(1, cleaned.length - 1);
            }
            return cleaned;
          });
          
          console.log('Linha processada:', cleanValues);
          
          if (cleanValues.length !== headers.length) {
            console.error(`Linha ${i} tem ${cleanValues.length} valores, mas esperava ${headers.length}`);
            errorRows.push(i);
            continue;
          }
          
          // Create lead object from CSV row
          try {
            const leadData: Record<string, any> = {};
            
            // Criar um mapa inverso para encontrar o campo de destino com base no header
            const reverseHeaderMap: Record<string, string> = {};
            Object.entries(headerMap).forEach(([key, values]) => {
              values.forEach(value => {
                reverseHeaderMap[value] = key;
              });
            });

            headers.forEach((header, index) => {
              const value = cleanValues[index] || "";
              const normalizedHeader = reverseHeaderMap[header] || header;
              
              switch(normalizedHeader) {
                case 'nome':
                  leadData.name = value;
                  break;
                case 'email':
                  leadData.email = value;
                  break;
                case 'telefone':
                  leadData.phone = value;
                  break;
                case 'estado':
                  leadData.state = value;
                  break;
                case 'campanha':
                  leadData.campaign = value;
                  break;
                case 'fonte':
                  leadData.source = value;
                  break;
                case 'status':
                  leadData.status = value || "Lead";
                  break;
                case 'tags':
                  // Processamento mais robusto para tags
                  if (value) {
                    // Primeiro verifica se está entre aspas duplas
                    let processedValue = value;
                    if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
                      // Remove as aspas e divide pelos delimitadores
                      processedValue = processedValue.substring(1, processedValue.length - 1);
                    }
                    // Divide por vírgulas ou ponto-e-vírgulas
                    leadData.tags = processedValue
                      .split(/[,;]/)
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0); // Remove tags vazias
                  } else {
                    leadData.tags = [];
                  }
                  break;
                case 'data_entrada':
                  try {
                    // Tenta converter a data de entrada para formato de string que o servidor conseguirá processar
                    if (value) {
                      // Formatar corretamente a data brasileira (DD/MM/YYYY)
                      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                        const [day, month, year] = value.split('/');
                        // Armazenar como string no formato ISO sem conversão para Date
                        leadData.entryDate = `${year}-${month}-${day}`;
                      } 
                      // Tenta lidar com o formato americano (MM/DD/YYYY)
                      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                        const [month, day, year] = value.split('/');
                        leadData.entryDate = `${year}-${month}-${day}`;
                      }
                      // Formato ISO (YYYY-MM-DD)
                      else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        leadData.entryDate = value;
                      }
                      // Formato apenas o ano (YYYY)
                      else if (/^\d{4}$/.test(value)) {
                        leadData.entryDate = `${value}-01-01`;
                      }
                      else {
                        // Usar a data atual para qualquer formato não reconhecido
                        console.warn(`Formato de data não reconhecido: ${value}`);
                        leadData.entryDate = new Date().toISOString().split('T')[0];
                      }
                      
                      console.log(`Processamento de data: original='${value}', processada='${leadData.entryDate}'`);
                    } else {
                      // Se não tem valor, usa a data atual sem a parte de hora
                      leadData.entryDate = new Date().toISOString().split('T')[0];
                    }
                  } catch (e) {
                    console.error('Erro ao processar data:', e);
                    leadData.entryDate = new Date().toISOString().split('T')[0];
                  }
                  break;
                case 'observacoes':
                case 'observações':
                  leadData.notes = value;
                  break;
              }
            });
            
            // Validate required fields
            if (!leadData.name || !leadData.email) {
              errorRows.push(i);
              continue;
            }
            
            // Set defaults for missing fields
            if (!leadData.status) leadData.status = "Lead";
            if (!leadData.source) leadData.source = "Favale";
            if (!leadData.tags) leadData.tags = [];
            if (!leadData.entryDate) leadData.entryDate = new Date().toISOString();
            
            leadsToImport.push(leadData as InsertLead);
          } catch (error) {
            console.error(`Erro ao processar linha ${i}:`, error);
            errorRows.push(i);
          }
        }
        
        // Report results
        if (leadsToImport.length === 0) {
          toast({
            title: "Erro na importação",
            description: "Nenhum lead válido encontrado no arquivo.",
            variant: "destructive",
          });
          return;
        }
        
        // Enviar leads em lote para a API em chunks para evitar problemas com tamanho de payload
        try {
          setImportProgress(50);
          
          // Processar em lotes de no máximo 250 leads para evitar problemas de tamanho de payload
          const BATCH_SIZE = 250;
          const totalBatches = Math.ceil(leadsToImport.length / BATCH_SIZE);
          console.log(`Processando ${leadsToImport.length} leads em ${totalBatches} lotes de ${BATCH_SIZE}`);
          
          // Reset estatísticas de importação
          setImportStats({
            currentBatch: 0,
            totalBatches,
            processedCount: 0,
            successCount: 0,
            errorCount: 0,
            updatedCount: 0,
            totalCount: leadsToImport.length,
            currentBatchSize: 0,
            statusMessage: 'Iniciando importação...',
            batchResults: []
          });
          
          let successCount = 0;
          let updatedCount = 0;
          let errorCount = 0;
          let details: Array<{index: number, id?: number, error?: string, action?: string, data?: any}> = [];
          
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, leadsToImport.length);
            const currentBatch = leadsToImport.slice(start, end);
            
            console.log(`Enviando lote ${batchIndex + 1}/${totalBatches} (${currentBatch.length} leads)`);
            
            // Atualizar estatísticas antes de iniciar o processamento do lote
            setImportStats(prev => ({
              ...prev,
              currentBatch: batchIndex + 1,
              currentBatchSize: currentBatch.length,
              statusMessage: `Processando lote ${batchIndex + 1} de ${totalBatches}...`
            }));
            
            setImportProgress(50 + Math.floor((batchIndex / totalBatches) * 40));
            const response = await fetch('/api/leads/batch/import', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ leads: currentBatch })
            });
            
            if (!response.ok) {
              let errorText;
              try {
                // Tenta obter o erro como JSON
                const errorJson = await response.json();
                errorText = errorJson.message || 'Erro desconhecido';
              } catch (e) {
                // Se não for JSON, tenta obter como texto
                errorText = await response.text();
              }
              throw new Error(`Erro na importação do lote ${batchIndex + 1}: ${errorText}`);
            }
            
            try {
              const batchResult = await response.json();
              console.log(`Resultado do lote ${batchIndex + 1}:`, batchResult);
              
              // Acumular resultados
              successCount += batchResult.successCount || 0;
              updatedCount += batchResult.updatedCount || 0;
              errorCount += batchResult.errorCount || 0;
              
              if (batchResult.details && Array.isArray(batchResult.details)) {
                details = [...details, ...batchResult.details];
              }
              
              // Atualizar estatísticas com os resultados deste lote
              setImportStats(prev => {
                const processedCount = prev.processedCount + currentBatch.length;
                const newSuccessCount = prev.successCount + (batchResult.successCount || 0);
                const newUpdatedCount = prev.updatedCount + (batchResult.updatedCount || 0);
                const newErrorCount = prev.errorCount + (batchResult.errorCount || 0);
                
                // Adicionar resultado do lote atual ao histórico
                const newBatchResults = [...prev.batchResults, {
                  batch: batchIndex + 1,
                  success: batchResult.successCount || 0,
                  updated: batchResult.updatedCount || 0,
                  errors: batchResult.errorCount || 0
                }];
                
                return {
                  ...prev,
                  currentBatch: batchIndex + 1,
                  processedCount,
                  successCount: newSuccessCount,
                  updatedCount: newUpdatedCount,
                  errorCount: newErrorCount,
                  statusMessage: `Lote ${batchIndex + 1} finalizado: ${batchResult.successCount || 0} leads importados, ${batchResult.updatedCount || 0} atualizados, ${batchResult.errorCount || 0} erros`,
                  batchResults: newBatchResults
                };
              });
            } catch (e) {
              console.error(`Erro ao parsear resultado JSON do lote ${batchIndex + 1}:`, e);
              throw new Error('Erro ao processar resposta do servidor');
            }
          }
          
          // Consolidar resultados de todos os lotes
          const result = {
            successCount,
            updatedCount,
            errorCount,
            details
          };
          
          console.log('Resultado final da importação em lotes:', result);
          
          // Atualizar a lista de leads após a importação bem-sucedida
          try {
            // Primeiro, invalidamos a consulta
            await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
            
            // Em seguida, disparamos manualmente uma nova consulta com await para garantir que seja concluída
            await queryClient.fetchQuery({ queryKey: ["/api/leads"] });
            console.log('Dados atualizados com sucesso após importação');
          } catch (e) {
            console.error('Erro ao atualizar dados após importação:', e);
          }
          
          // Atualizar mensagem final das estatísticas
          setImportStats(prev => ({
            ...prev,
            statusMessage: 'Importação finalizada com sucesso!',
          }));
          
          setImportProgress(100);
          
          // Show results
          setImportDialogOpen(false);
          const totalSuccess = (result.successCount || 0) + (result.updatedCount || 0);
          
          toast({
            title: "Importação concluída",
            description: `${result.successCount || 0} leads importados${result.updatedCount > 0 ? ` e ${result.updatedCount} atualizados` : ''} com sucesso.${result.errorCount > 0 ? ` ${result.errorCount} leads com erro.` : ''}`,
            variant: totalSuccess > 0 ? "default" : "destructive",
          });
        } catch (error) {
          console.error('Erro ao importar leads em lote:', error);
          
          toast({
            title: "Erro na importação",
            description: error instanceof Error ? error.message : "Ocorreu um erro ao importar os leads.",
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast({
          title: "Erro na importação",
          description: "Ocorreu um erro ao processar o arquivo.",
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Erro na importação",
        description: "Erro ao ler o arquivo.",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
    e.target.value = ''; // Reset the input
  };
  
  const handleExportLeads = async () => {
    if (!filteredLeads || filteredLeads.length === 0) return;
    
    setExportLoading(true);
    setExportProgress(10);
    
    try {
      // Define headers
      const headers = [
        'ID', 'Nome', 'Email', 'Telefone', 'Estado', 'Status', 
        'Fonte', 'Campanha', 'Tags', 'Data de Entrada', 'Observações'
      ];
      
      setExportProgress(25);
      
      // Process data based on format
      let blob: Blob;
      let filename: string;
      
      if (exportFormat === 'json') {
        // Create JSON export
        const jsonData = filteredLeads.map(lead => ({
          id: lead.id,
          nome: lead.name,
          email: lead.email,
          telefone: lead.phone,
          estado: lead.state,
          status: lead.status,
          fonte: lead.source,
          campanha: lead.campaign,
          tags: lead.tags.join(', '),
          data_entrada: new Date(lead.entryDate).toLocaleDateString('pt-BR'),
          observacoes: lead.notes
        }));
        
        setExportProgress(50);
        const jsonContent = JSON.stringify(jsonData, null, 2);
        blob = new Blob([jsonContent], { type: 'application/json' });
        filename = `leads_${new Date().toISOString().slice(0, 10)}.json`;
      } 
      else if (exportFormat === 'excel') {
        // Create Excel-compatible CSV (UTF-8 with BOM)
        setExportProgress(40);
        
        // Map leads to CSV rows
        const csvRows = filteredLeads.map(lead => {
          const values = [
            lead.id,
            lead.name,
            lead.email,
            lead.phone,
            lead.state,
            lead.status,
            lead.source,
            lead.campaign,
            lead.tags.join('; '), // Use semicolon for tags in Excel format
            new Date(lead.entryDate).toLocaleDateString('pt-BR'),
            lead.notes
          ];
          
          // Escape values that might contain separators
          return values.map(value => 
            typeof value === 'string' && (value.includes(';') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          ).join(';'); // Use semicolon as separator for Excel
        });
        
        setExportProgress(60);
        // Add BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + [headers.join(';'), ...csvRows].join('\n');
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      } 
      else {
        // Default CSV format
        setExportProgress(40);
        
        // Map leads to CSV rows
        const csvRows = filteredLeads.map(lead => {
          const values = [
            lead.id,
            lead.name,
            lead.email,
            lead.phone,
            lead.state,
            lead.status,
            lead.source,
            lead.campaign,
            lead.tags.join(', '),
            new Date(lead.entryDate).toLocaleDateString('pt-BR'),
            lead.notes
          ];
          
          // Escape values that might contain commas
          return values.map(value => 
            typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value
          ).join(',');
        });
        
        setExportProgress(60);
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
      }
      
      setExportProgress(80);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      
      if (csvLinkRef.current) {
        csvLinkRef.current.href = url;
        csvLinkRef.current.download = filename;
        csvLinkRef.current.click();
      }
      
      setExportProgress(100);
      
      // Show toast notification
      toast({
        title: "Exportação concluída",
        description: `${filteredLeads.length} leads exportados com sucesso no formato ${exportFormat.toUpperCase()}.`,
        variant: "default",
      });
      
      // Close dialog after successful export
      setTimeout(() => {
        setExportDialogOpen(false);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao exportar leads:', error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os leads.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
      // Reset progress after a short delay to allow for animation
      setTimeout(() => setExportProgress(0), 1000);
    }
  };

  const confirmImport = async () => {
    if (parsedLeads.length === 0) return;
    
    // Reset estatísticas de importação
    setImportStats({
      currentBatch: 0,
      totalBatches: 1,
      processedCount: 0,
      successCount: 0,
      errorCount: 0,
      updatedCount: 0,
      totalCount: parsedLeads.length,
      currentBatchSize: parsedLeads.length,
      statusMessage: 'Iniciando importação...',
      batchResults: []
    });
    
    try {
      setImportProgress(60);
      setImportStats(prev => ({
        ...prev,
        statusMessage: 'Enviando dados para o servidor...'
      }));
      
      // Enviar leads em lote para a API
      const response = await fetch('/api/leads/batch/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ leads: parsedLeads })
      });
      
      let result;
      if (!response.ok) {
        let errorText;
        try {
          // Tenta obter o erro como JSON
          const errorJson = await response.json();
          errorText = errorJson.message || 'Erro desconhecido';
        } catch (e) {
          // Se não for JSON, tenta obter como texto
          errorText = await response.text();
        }
        
        setImportStats(prev => ({
          ...prev,
          statusMessage: `Erro: ${errorText}`,
        }));
        
        throw new Error(`Erro na importação em lote: ${errorText}`);
      }
      
      try {
        result = await response.json();
      } catch (e) {
        console.error('Erro ao parsear resultado JSON:', e);
        throw new Error('Erro ao processar resposta do servidor');
      }
      console.log('Resultado da importação em lote:', result);
      
      // Atualizar estatísticas com os resultados
      setImportStats(prev => {
        const successCount = result.successCount || 0;
        const updatedCount = result.updatedCount || 0;
        const errorCount = result.errorCount || 0;
        
        // Adicionar resultado do lote ao histórico
        const newBatchResults = [...prev.batchResults, {
          batch: 1,
          success: successCount,
          updated: updatedCount,
          errors: errorCount
        }];
        
        return {
          ...prev,
          currentBatch: 1,
          processedCount: parsedLeads.length,
          successCount,
          updatedCount,
          errorCount,
          statusMessage: 'Processamento concluído, atualizando dados...',
          batchResults: newBatchResults
        };
      });
      
      // Atualizar a lista de leads após a importação bem-sucedida
      try {
        // Primeiro, invalidamos a consulta
        await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        
        // Em seguida, disparamos manualmente uma nova consulta com await para garantir que seja concluída
        await queryClient.fetchQuery({ queryKey: ["/api/leads"] });
        console.log('Dados atualizados com sucesso após importação');
        
        // Atualizar mensagem final
        setImportStats(prev => ({
          ...prev,
          statusMessage: 'Importação finalizada com sucesso!'
        }));
      } catch (e) {
        console.error('Erro ao atualizar dados após importação:', e);
      }
      
      // Show results
      setImportProgress(100);
      setImportDialogOpen(false);
      setShowPreview(false);
      setPreviewData([]);
      setParsedLeads([]);
      
      const updatedCount = result.updatedCount || 0;
      const totalSuccess = (result.successCount || 0) + updatedCount;
      
      toast({
        title: "Importação concluída",
        description: `${result.successCount || 0} leads importados${updatedCount > 0 ? ` e ${updatedCount} atualizados` : ''} com sucesso.${result.errorCount > 0 ? ` ${result.errorCount} leads com erro.` : ''}`,
        variant: totalSuccess > 0 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Erro ao processar importação:', error);
      
      setImportStats(prev => ({
        ...prev,
        statusMessage: error instanceof Error ? error.message : 'Erro desconhecido durante a importação'
      }));
      
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao importar os leads.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
      setImportProgress(0);
    }
  };
  
  // Reset progress and data when dialog closes
  useEffect(() => {
    if (!importDialogOpen) {
      setImportProgress(0);
      setImportLoading(false);
      
      // Only reset preview data if not in the middle of import
      if (!importLoading) {
        setShowPreview(false);
        setPreviewData([]);
        setParsedLeads([]);
      }
    }
  }, [importDialogOpen, importLoading]);
  
  // Filtered leads processing
  const filteredLeads = leads?.filter(lead => {
    // Search term filter
    const matchesSearch = searchTerm === "" ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Dropdown filters
    const matchesSource = filters.source === "" || lead.source === filters.source;
    const matchesStatus = filters.status === "" || lead.status === filters.status;
    const matchesCampaign = filters.campaign === "" || lead.campaign === filters.campaign;
    
    // Advanced filters
    const matchesState = filters.state === "" || lead.state === filters.state;
    
    // Tag filter
    const matchesTag = filters.tag === "" || (lead.tags && lead.tags.includes(filters.tag));
    
    // Date filters
    let matchesDateRange = true;
    if (filters.startDate && filters.endDate) {
      const leadDate = new Date(lead.entryDate);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      // Add one day to end date to include the end date itself
      endDate.setDate(endDate.getDate() + 1);
      
      matchesDateRange = leadDate >= startDate && leadDate < endDate;
    } else if (filters.startDate) {
      const leadDate = new Date(lead.entryDate);
      const startDate = new Date(filters.startDate);
      matchesDateRange = leadDate >= startDate;
    } else if (filters.endDate) {
      const leadDate = new Date(lead.entryDate);
      const endDate = new Date(filters.endDate);
      // Add one day to end date to include the end date itself
      endDate.setDate(endDate.getDate() + 1);
      matchesDateRange = leadDate < endDate;
    }
    
    return matchesSearch && matchesSource && matchesStatus && matchesCampaign && 
           matchesState && matchesDateRange && matchesTag;
  });

  // Check if there are active filters
  const hasActiveFilters = [
    filters.source,
    filters.status,
    filters.campaign,
    filters.state,
    filters.startDate,
    filters.endDate,
    filters.tag,
    filters.dateRange
  ].some(filter => filter !== "");
  
  // Count active filters
  const activeFilterCount = [
    filters.source,
    filters.status,
    filters.campaign,
    filters.state,
    filters.tag,
    (filters.startDate || filters.endDate || filters.dateRange) ? 1 : 0, // Count date range as one filter
  ].filter(Boolean).length;

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-600">
        <p>Erro ao carregar leads. Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button 
            className={`${hasActiveFilters 
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'} 
              border rounded-md px-4 py-2 text-sm 
              ${hasActiveFilters 
                ? 'text-primary-700 dark:text-primary-300' 
                : 'text-gray-700 dark:text-gray-300'} 
              hover:bg-primary-50 dark:hover:bg-primary-900/20 
              flex items-center transition-colors duration-200 relative`
            }
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <span className={`material-icons text-sm mr-1 
              ${hasActiveFilters ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400 dark:text-pink-400'}`}>
              filter_list
            </span>
            Filtrar
            {hasActiveFilters && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center dark:glow-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
            onClick={() => setExportDialogOpen(true)}
            disabled={!filteredLeads || filteredLeads.length === 0}
          >
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">file_download</span>
            Exportar
          </button>
          
          <button 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
            onClick={() => setImportDialogOpen(true)}
          >
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">upload_file</span>
            Importar
          </button>
          <a ref={csvLinkRef} style={{ display: 'none' }} />
          

          <button 
            className="bg-primary text-white rounded-md px-4 py-2 text-sm flex items-center hover:bg-primary/90 dark:glow-button-sm transition-all duration-200"
            onClick={handleNewLead}
          >
            <span className="material-icons text-sm mr-1">add</span>
            Novo Lead
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-1 md:col-span-3 lg:col-span-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar leads..." 
                className="w-full border dark:border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-icons absolute left-3 top-2 text-gray-400 dark:text-gray-300 text-sm">search</span>
            </div>
          </div>
          <div>
            <select 
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
            >
              <option value="">Origem</option>
              <option value="Favale">Favale</option>
              <option value="Pink">Pink</option>
            </select>
          </div>
          <div>
            <select 
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Status</option>
              <option value="Lead">Lead</option>
              <option value="Aluno">Aluno</option>
            </select>
          </div>
          <div>
            <select 
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
              value={filters.campaign}
              onChange={(e) => setFilters({...filters, campaign: e.target.value})}
            >
              <option value="">Campanha</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Email">E-mail</option>
              <option value="Site">Site</option>
              <option value="Indicação">Indicação</option>
            </select>
          </div>
        </div>
        
        {/* Advanced filter panel */}
        {filterMenuOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filtros Avançados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.state || ""}
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="PR">Paraná</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="BA">Bahia</option>
                  <option value="DF">Distrito Federal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Entrada</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    className="flex-1 border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                    value={filters.startDate || ""}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <span className="text-gray-500 dark:text-gray-400">até</span>
                  <input 
                    type="date" 
                    className="flex-1 border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                    value={filters.endDate || ""}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tag</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.tag || ""}
                  onChange={(e) => setFilters({...filters, tag: e.target.value})}
                >
                  <option value="">Todas</option>
                  {getUniqueTags().map((tag, index) => (
                    <option key={index} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.dateRange || ""}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="last7days">Últimos 7 dias</option>
                  <option value="last30days">Últimos 30 dias</option>
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                  <option value="thisYear">Este ano</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button 
                  className="w-full bg-primary text-white rounded-md px-4 py-2 text-sm flex items-center justify-center hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
                  onClick={() => setFilters({ 
                    source: "", 
                    status: "", 
                    campaign: "", 
                    state: "", 
                    startDate: "", 
                    endDate: "",
                    tag: "",
                    dateRange: ""
                  })}
                >
                  <span className="material-icons text-sm mr-1">clear</span>
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Batch Operations Bar - only visible when leads are selected */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4 transition-colors duration-200">
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-semibold text-primary dark:text-pink-400 mr-2">{selectedLeadIds.length}</span>
              <span className="text-gray-700 dark:text-gray-300">leads selecionados</span>
            </div>
            <div className="flex items-center space-x-3 mt-1 text-sm">
              <button 
                onClick={() => setSelectedLeadIds([])}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs transition-colors duration-200"
              >
                Limpar seleção
              </button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs font-medium text-primary dark:text-primary-light hover:text-primary/80 dark:hover:text-primary-light/80 transition-colors duration-200 flex items-center">
                    Selecionar mais <span className="material-icons text-xs ml-0.5">arrow_drop_down</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg dark:shadow-gray-900/50 z-50"
                >
                  <DropdownMenuItem 
                    className="text-sm px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center"
                    onClick={() => {
                      // Selecionar todos os leads da página atual
                      const pageLeads = (filteredLeads || []).slice(indexOfFirstLead, indexOfLastLead).map(lead => lead.id);
                      const newSelection = [...new Set([...selectedLeadIds, ...pageLeads])];
                      setSelectedLeadIds(newSelection);
                    }}
                  >
                    <span className="material-icons text-xs mr-2">view_list</span>
                    Todos da página atual
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-sm px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center"
                    onClick={() => {
                      // Selecionar todos os leads
                      const allIds = (filteredLeads || []).map(lead => lead.id);
                      setSelectedLeadIds(allIds);
                    }}
                  >
                    <span className="material-icons text-xs mr-2">select_all</span>
                    Todos os leads ({filteredLeads?.length || 0})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={batchStatusValue}
              onValueChange={setBatchStatusValue}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Aluno">Aluno</SelectItem>
              </SelectContent>
            </Select>
            
            <button 
              className="bg-primary text-white rounded-md px-3 py-1 text-sm hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
              onClick={handleBatchStatusUpdate}
              disabled={!batchStatusValue}
            >
              Aplicar
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={batchSourceValue}
              onValueChange={setBatchSourceValue}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Alterar origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Favale">Favale</SelectItem>
                <SelectItem value="Pink">Pink</SelectItem>
              </SelectContent>
            </Select>
            
            <button 
              className="bg-primary text-white rounded-md px-3 py-1 text-sm hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
              onClick={handleBatchSourceUpdate}
              disabled={!batchSourceValue}
            >
              Aplicar
            </button>
          </div>
          
          <button 
            className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md px-3 py-1 text-sm transition-colors duration-200"
            onClick={handleBatchDelete}
          >
            Excluir selecionados
          </button>
        </div>
      )}

      {/* Lead table */}
      <LeadTable 
        leads={filteredLeads || []} 
        isLoading={isLoading} 
        onDelete={handleDelete}
        indexOfFirstLead={indexOfFirstLead}
      />

      {/* Lead Dialog */}
      <LeadDialog />
      
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Leads</DialogTitle>
            <DialogDescription>
              Selecione o formato para exportar {filteredLeads?.length || 0} leads.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Formato de exportação</label>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as "csv" | "json" | "excel")}
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel CSV (compatível)</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {exportFormat === "csv" && "Formato padrão CSV, fácil de importar em qualquer sistema."}
                {exportFormat === "excel" && "Formato otimizado para importação no Excel, com suporte a caracteres especiais."}
                {exportFormat === "json" && "Formato estruturado para uso em sistemas e aplicações."}
              </p>
            </div>
            
            {exportLoading && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {exportProgress < 50 ? 'Preparando dados...' : 
                    exportProgress < 100 ? 'Gerando arquivo...' : 'Download concluído!'}
                  </span>
                  <span className="text-sm font-medium">{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} className="h-2" />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <button
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setExportDialogOpen(false)}
              disabled={exportLoading}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
              onClick={handleExportLeads}
              disabled={exportLoading || !filteredLeads || filteredLeads.length === 0}
            >
              {exportLoading ? 'Exportando...' : 'Exportar agora'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Leads</DialogTitle>
            <DialogDescription>
              Importe leads a partir de um arquivo CSV. O arquivo deve seguir o seguinte formato:
            </DialogDescription>
          </DialogHeader>
          
          {importLoading && (
            <div className="my-4 space-y-4">
              {/* Barra de progresso principal */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {importProgress < 60 ? 'Processando arquivo...' : 
                     importProgress < 100 ? 'Importando leads...' : 'Concluído!'}
                  </span>
                  <span className="text-sm font-medium">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
              
              {/* Detalhes das estatísticas */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-800">
                <div className="mb-3">
                  <h4 className="text-sm font-medium mb-1">Status da importação</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{importStats.statusMessage}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Lote atual</div>
                    <div className="text-lg font-semibold">{importStats.currentBatch} / {importStats.totalBatches}</div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Processados</div>
                    <div className="text-lg font-semibold">{importStats.processedCount} / {importStats.totalCount}</div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Importados</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-500">{importStats.successCount + importStats.updatedCount}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="text-emerald-600 dark:text-emerald-500">{importStats.successCount} novos</span> / 
                      <span className="text-blue-600 dark:text-blue-500"> {importStats.updatedCount} atualizados</span>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Erros</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-500">{importStats.errorCount}</div>
                  </div>
                </div>
                
                {/* Histórico de lotes processados */}
                {importStats.batchResults.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Histórico de lotes</h4>
                    <div className="bg-white dark:bg-gray-800 rounded-md overflow-hidden">
                      <div className="max-h-32 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Lote</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Novos</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Atualizados</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Erros</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importStats.batchResults.map((batch, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                <td className="px-3 py-2 text-xs">{batch.batch}</td>
                                <td className="px-3 py-2 text-xs text-emerald-600 dark:text-emerald-500">{batch.success}</td>
                                <td className="px-3 py-2 text-xs text-blue-600 dark:text-blue-500">{batch.updated}</td>
                                <td className="px-3 py-2 text-xs text-red-600 dark:text-red-500">{batch.errors}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!showPreview ? (
            <div className="my-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border dark:border-gray-700 mb-4 overflow-x-auto">
                <code className="text-xs">
                  <span className="text-blue-600 dark:text-blue-400">nome</span>,
                  <span className="text-blue-600 dark:text-blue-400">email</span>,
                  <span className="text-blue-600 dark:text-blue-400">telefone</span>,
                  <span className="text-blue-600 dark:text-blue-400">estado</span>,
                  <span className="text-blue-600 dark:text-blue-400">campanha</span>,
                  <span className="text-blue-600 dark:text-blue-400">origem</span>,
                  <span className="text-blue-600 dark:text-blue-400">status</span>,
                  <span className="text-blue-600 dark:text-blue-400">tags</span>,
                  <span className="text-blue-600 dark:text-blue-400">data_entrada</span>,
                  <span className="text-blue-600 dark:text-blue-400">observacoes</span>
                </code>
              </div>
              
              <ul className="space-y-2 text-sm mb-4">
                <li><span className="font-medium">nome</span>: Nome completo do lead (obrigatório)</li>
                <li><span className="font-medium">email</span>: Email do lead (obrigatório)</li>
                <li><span className="font-medium">telefone</span>: Número de telefone</li>
                <li><span className="font-medium">estado</span>: Sigla do estado (ex: SP, RJ)</li>
                <li><span className="font-medium">campanha</span>: Canal de origem (Instagram, Facebook, Email, Site, Indicação)</li>
                <li><span className="font-medium">origem</span>: Deve ser "Favale" ou "Pink"</li>
                <li><span className="font-medium">status</span>: Deve ser "Lead" ou "Aluno"</li>
                <li><span className="font-medium">tags</span>: Lista de tags separadas por ponto-e-vírgula (ex: "tag1;tag2;tag3")</li>
                <li><span className="font-medium">data_entrada</span>: Data no formato DD/MM/YYYY (ex: 31/01/2023)</li>
                <li><span className="font-medium">observacoes</span>: Notas adicionais</li>
              </ul>
              
              <div className="mb-4">
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                <button 
                  className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                >
                  <span className="material-icons text-3xl text-gray-400 mb-2">upload_file</span>
                  <span className="text-gray-600 dark:text-gray-300">Clique para selecionar um arquivo CSV</span>
                  <span className="text-gray-400 text-sm mt-1">ou arraste e solte aqui</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="my-4">
              <h3 className="text-lg font-medium mb-2">Pré-visualização ({previewData.length} leads)</h3>
              
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden mb-4">
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {previewData.length > 0 && Object.keys(previewData[0]).map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {previewData.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                          {Object.values(row).map((cell: any, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
                              {typeof cell === 'string' && cell.length > 30 ? `${cell.substring(0, 30)}...` : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length > 5 && (
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                    Mostrando 5 de {previewData.length} leads
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData([]);
                    setParsedLeads([]);
                  }}
                  disabled={importLoading}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
                  onClick={confirmImport}
                  disabled={importLoading || parsedLeads.length === 0}
                >
                  {importLoading ? 'Importando...' : `Importar ${parsedLeads.length} leads`}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead {selectedLead?.name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:glow-red-sm transition-all duration-200"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Leads Selecionados</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir <span className="font-bold text-red-600 dark:text-red-400">{selectedLeadIds.length}</span> leads.
              </p>
              <p>
                {selectedLeadIds.length > 100 && 
                  <span className="block font-semibold text-amber-600 dark:text-amber-400 mb-2">
                    Atenção: Você selecionou um grande número de leads!
                  </span>
                }
                Esta ação <span className="font-bold">não pode ser desfeita</span> e os dados serão excluídos permanentemente.
              </p>
              <p className="text-sm opacity-80">
                Você tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBatchDelete}
              className="bg-red-600 hover:bg-red-700 dark:glow-red-sm transition-all duration-200"
            >
              Excluir {selectedLeadIds.length} leads
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
