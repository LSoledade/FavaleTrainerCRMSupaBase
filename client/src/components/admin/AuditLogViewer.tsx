import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, RefreshCw, FileDown } from "lucide-react";
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

// Tipos para os logs de auditoria
interface AuditLog {
  timestamp: string;
  type: string;
  userId: string | number;
  username: string;
  ip: string;
  details: any;
}

export default function AuditLogViewer() {
  const [filter, setFilter] = useState<string>('');
  const [eventType, setEventType] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const { data: logs, isLoading, isError, refetch } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs', { count: limit }],
    queryFn: async () => {
      const response = await fetch(`/api/audit-logs?count=${limit}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar logs de auditoria');
      }
      return await response.json();
    },
  });

  // Função para exportar logs para CSV
  const exportToCSV = () => {
    if (!logs) return;

    const headers = ['Data e Hora', 'Tipo de Evento', 'Usuário', 'ID do Usuário', 'IP', 'Detalhes'];
    
    // Converter logs para linhas CSV
    const rows = logs
      .filter(log => filterLog(log))
      .map(log => [
        format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: pt }),
        log.type,
        log.username,
        log.userId,
        log.ip,
        JSON.stringify(log.details)
      ]);
    
    // Combinar cabeçalho e linhas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs-auditoria-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtro de logs
  const filterLog = (log: AuditLog) => {
    // Filtrar por tipo de evento
    if (eventType && eventType !== 'all' && log.type !== eventType) {
      return false;
    }
    
    // Filtrar por texto de pesquisa
    if (filter) {
      const searchLower = filter.toLowerCase();
      return (
        log.username.toLowerCase().includes(searchLower) ||
        log.type.toLowerCase().includes(searchLower) ||
        log.ip.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  };

  // Formatar tipo de evento para exibição
  const formatEventType = (type: string) => {
    const eventTypes: Record<string, string> = {
      LOGIN_SUCCESS: 'Login com Sucesso',
      LOGIN_FAILURE: 'Falha no Login',
      LOGOUT: 'Logout',
      USER_CREATED: 'Usuário Criado',
      USER_UPDATED: 'Usuário Atualizado',
      USER_DELETED: 'Usuário Excluído',
      LEAD_CREATED: 'Lead Criado',
      LEAD_UPDATED: 'Lead Atualizado',
      LEAD_DELETED: 'Lead Excluído',
      LEAD_BATCH_UPDATE: 'Atualização em Lote de Leads',
      LEAD_BATCH_DELETE: 'Exclusão em Lote de Leads'
    };
    
    return eventTypes[type] || type;
  };

  // Obter tipos de eventos únicos para o filtro
  const eventTypes = logs 
    ? logs.reduce<string[]>((types, log) => {
        if (!types.includes(log.type)) {
          types.push(log.type);
        }
        return types;
      }, [])
    : [];

  // Filtrar logs
  const filteredLogs = logs?.filter(filterLog) || [];

  if (isError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>Registro de atividades do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-red-500">
            Erro ao carregar os logs de auditoria. Por favor, tente novamente.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Logs de Auditoria</CardTitle>
        <CardDescription>Registro de atividades do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Input
              placeholder="Pesquisar logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Tipo de Evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Eventos</SelectItem>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {formatEventType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={limit.toString()} 
            onValueChange={(value) => setLimit(parseInt(value))}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Limite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 registros</SelectItem>
              <SelectItem value="100">100 registros</SelectItem>
              <SelectItem value="200">200 registros</SelectItem>
              <SelectItem value="500">500 registros</SelectItem>
              <SelectItem value="1000">1000 registros</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} title="Atualizar">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportToCSV} title="Exportar CSV">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center p-6 text-gray-500">
            Nenhum log encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Data e Hora</th>
                    <th className="px-4 py-3 text-left">Tipo de Evento</th>
                    <th className="px-4 py-3 text-left">Usuário</th>
                    <th className="px-4 py-3 text-left">IP</th>
                    <th className="px-4 py-3 text-left">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 align-top">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: pt })}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.type.includes('LOGIN_FAILURE') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            log.type.includes('DELETED') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            log.type.includes('CREATED') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            log.type.includes('UPDATED') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {formatEventType(log.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">{log.username}</td>
                      <td className="px-4 py-3 align-top">{log.ip}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="max-w-xs whitespace-normal break-words">
                          {Object.entries(log.details || {}).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium">{key}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-500">
          Mostrando {filteredLogs.length} de {logs?.length || 0} registros
        </div>
      </CardContent>
    </Card>
  );
}
