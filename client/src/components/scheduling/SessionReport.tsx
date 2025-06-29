import { useState } from 'react';
import { format, startOfMonth, endOfMonth, sub, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

type StudentOption = {
  id: string;
  name: string;
  source: 'Favale' | 'Pink';
};

type ReportSession = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  trainerName: string;
  source: 'Favale' | 'Pink';
  status: string;
  location: string;
  value: number;
};

export function SessionReport() {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [reportData, setReportData] = useState<ReportSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch real data from APIs
  const { data: sessions = [] } = useQuery({
    queryKey: ['/api/sessions'],
    queryFn: () => fetch('/api/sessions').then(res => res.json())
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    queryFn: () => fetch('/api/leads').then(res => res.json())
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['/api/trainers'],
    queryFn: () => fetch('/api/trainers').then(res => res.json())
  });

  // Filter leads to get only students (alunos)
  const students = leads
    .filter((lead: any) => lead.tags?.includes('aluno'))
    .map((lead: any) => ({
      id: lead.id.toString(),
      name: lead.name,
      source: lead.source || 'Favale'
    }));
  
  // Filter students based on selected source
  const filteredStudents = selectedSource 
    ? students.filter(student => student.source === selectedSource) 
    : students;
  
  // Função para gerar relatório
  // Helper functions to get names from IDs
  const getStudentName = (leadId: number) => {
    const lead = leads.find((l: any) => l.id === leadId);
    return lead?.name || 'Estudante';
  };

  const getTrainerName = (trainerId: number) => {
    const trainer = trainers.find((t: any) => t.id === trainerId);
    return trainer?.name || 'Professor';
  };

  const generateReport = () => {
    setIsLoading(true);
    
    try {
      // Filter sessions based on criteria
      let filteredSessions = sessions.filter((session: any) => {
        const sessionDate = new Date(session.startTime);
        const isInDateRange = sessionDate >= fromDate && sessionDate <= toDate;
        const matchesSource = !selectedSource || session.source === selectedSource;
        const matchesStudent = !selectedStudent || session.leadId.toString() === selectedStudent;
        
        return isInDateRange && matchesSource && matchesStudent;
      });

      // Convert sessions to report format
      const reportSessions = filteredSessions.map((session: any) => {
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
        
        return {
          id: session.id,
          date: format(startTime, 'yyyy-MM-dd'),
          startTime: format(startTime, 'HH:mm'),
          endTime: format(endTime, 'HH:mm'),
          duration: duration > 60 ? `${Math.floor(duration/60)}h${duration%60 > 0 ? ` ${duration%60}min` : ''}` : `${duration}min`,
          trainerName: getTrainerName(session.trainerId),
          source: session.source,
          status: session.status === 'agendado' ? 'Agendado' : 
                 session.status === 'completed' ? 'Concluída' : 
                 session.status === 'cancelled' ? 'Cancelada' : session.status,
          location: session.location,
          value: session.value || 0,
        };
      });

      setReportData(reportSessions);
      setIsLoading(false);
      
      toast({
        title: 'Relatório gerado',
        description: `${reportSessions.length} sessões encontradas.`,
      });
    } catch (error) {
      setIsLoading(false);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Ocorreu um erro ao processar os dados.',
        variant: 'destructive'
      });
    }
  };
  
  // Função para exportar relatório como CSV
  const exportAsCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: 'Nenhum dado disponível',
        description: 'Gere um relatório antes de exportar.',
        variant: 'destructive',
      });
      return;
    }
    
    // Criar cabeçalho CSV
    const headers = ['ID', 'Data', 'Horário', 'Duração', 'Professor', 'Categoria', 'Status', 'Local', 'Valor'];
    
    // Formatar dados para CSV
    const dataRows = reportData.map(session => [
      session.id,
      format(parseISO(session.date), 'dd/MM/yyyy'),
      `${session.startTime} - ${session.endTime}`,
      session.duration,
      session.trainerName,
      session.source,
      session.status,
      session.location,
      `R$ ${session.value.toFixed(2)}`,
    ]);
    
    // Combinar cabeçalho e linhas
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_sessoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Relatório exportado',
      description: 'O relatório foi exportado com sucesso no formato CSV.',
    });
  };
  
  // Função para imprimir relatório
  const printReport = () => {
    if (reportData.length === 0) {
      toast({
        title: 'Nenhum dado disponível',
        description: 'Gere um relatório antes de imprimir.',
        variant: 'destructive',
      });
      return;
    }
    
    // Abrir janela de impressão
    window.print();
    
    toast({
      title: 'Imprimindo relatório',
      description: 'O relatório foi enviado para impressão.',
    });
  };
  
  // Calcular valor total do relatório
  const totalValue = reportData.reduce((sum, session) => sum + session.value, 0);
  
  // Atalhos rápidos para períodos
  const setPeriodPreset = (preset: string) => {
    const today = new Date();
    
    switch (preset) {
      case 'current-month':
        setFromDate(startOfMonth(today));
        setToDate(endOfMonth(today));
        break;
      case 'last-month':
        const lastMonth = sub(today, { months: 1 });
        setFromDate(startOfMonth(lastMonth));
        setToDate(endOfMonth(lastMonth));
        break;
      case 'last-3-months':
        setFromDate(startOfMonth(sub(today, { months: 2 })));
        setToDate(endOfMonth(today));
        break;
      case 'current-year':
        setFromDate(new Date(today.getFullYear(), 0, 1));
        setToDate(new Date(today.getFullYear(), 11, 31));
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 print:m-6">
      {/* Opções de relatório - não imprime */}
      <div className="print:hidden">
        <Tabs defaultValue="by-student">
          <TabsList>
            <TabsTrigger value="by-student">Por Aluno</TabsTrigger>
            <TabsTrigger value="by-period">Por Período</TabsTrigger>
            <TabsTrigger value="by-category">Por Categoria</TabsTrigger>
          </TabsList>
          
          <TabsContent value="by-student" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="student">Aluno</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="source">Categoria</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Favale">Favale</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={generateReport} 
                  disabled={!selectedStudent || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="by-period" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(date) => setFromDate(date || startOfMonth(new Date()))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="md:col-span-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(date) => setToDate(date || endOfMonth(new Date()))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Período</Label>
                <Select defaultValue="select" onValueChange={setPeriodPreset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select">Selecionar período</SelectItem>
                    <SelectItem value="current-month">Mês Atual</SelectItem>
                    <SelectItem value="last-month">Mês Anterior</SelectItem>
                    <SelectItem value="last-3-months">Últimos 3 Meses</SelectItem>
                    <SelectItem value="current-year">Ano Atual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={generateReport} 
                  disabled={!fromDate || !toDate || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="by-category" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="category-source">Categoria</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger id="category-source">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Favale">Favale</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <Button 
                  onClick={generateReport} 
                  disabled={!selectedSource || isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Data do relatório */}
      {reportData.length > 0 && (
        <div className="space-y-6">
          {/* Cabeçalho do relatório - inclui em ambos modos */}
          <div className="print:mt-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">Relatório de Sessões</h3>
                <p className="text-muted-foreground">
                  Período: {format(fromDate, "dd/MM/yyyy")} - {format(toDate, "dd/MM/yyyy")}
                </p>
                {selectedStudent && (
                  <p className="text-muted-foreground">
                    Aluno: {students.find(s => s.id === selectedStudent)?.name || selectedStudent}
                  </p>
                )}
                {selectedSource && (
                  <p className="text-muted-foreground">
                    Categoria: {selectedSource}
                  </p>
                )}
              </div>
              
              {/* Botões de ação - não imprime */}
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={exportAsCSV}>
                  <Download className="h-4 w-4 mr-2" /> 
                  Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={printReport}>
                  <Printer className="h-4 w-4 mr-2" /> 
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
          
          {/* Tabela de resultados */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{format(parseISO(session.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {session.startTime} - {session.endTime} ({session.duration})
                    </TableCell>
                    <TableCell>{session.trainerName}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={session.source === 'Favale' ? 
                          'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' : 
                          'bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800'}
                      >
                        {session.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{session.location}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {session.value.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={5} className="text-right">
                    Total:
                  </TableCell>
                  <TableCell className="text-right">
                    R$ {totalValue.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Resumo para fatura */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Total de Sessões</h4>
                  <p className="text-2xl font-bold">{reportData.length}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Total de Horas</h4>
                  <p className="text-2xl font-bold">{reportData.length}h</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Valor Total</h4>
                  <p className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}