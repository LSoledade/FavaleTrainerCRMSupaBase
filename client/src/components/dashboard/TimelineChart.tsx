import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";

interface LeadTimeData {
  name: string;
  novosLeads: number;
  convertidos: number;
  sessoes: number;
}

export default function TimelineChart() {
  const [timeRange, setTimeRange] = useState('7d');
  const [darkMode, setDarkMode] = useState(false);
  const [chartData, setChartData] = useState<LeadTimeData[]>([]);
  
  // Dados de leads
  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    enabled: true,
  });
  
  // Dados de sessões
  const { data: sessions } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
    enabled: true,
  });

  // Detectar tema escuro
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setDarkMode(isDark);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  
  // Calcular dados para o gráfico com base nos dados reais
  useEffect(() => {
    if (!leads || !sessions) return;
    
    // Preparar datas para o período selecionado
    const today = new Date();
    const dates: Date[] = [];
    let days = 7;
    
    if (timeRange === '30d') {
      days = 30;
    } else if (timeRange === 'year') {
      days = 365;
    }
    
    // Gerar array de datas para o período
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    // Formatar os dados de acordo com o período escolhido
    const generatedData: LeadTimeData[] = [];
    
    if (timeRange === 'year') {
      // Dados mensais para o ano
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthData: Record<string, LeadTimeData> = {};
      
      months.forEach(month => {
        monthData[month] = { name: month, novosLeads: 0, convertidos: 0, sessoes: 0 };
      });
      
      // Contar leads por mês
      leads.forEach(lead => {
        const date = new Date(lead.entryDate);
        if (date.getFullYear() === today.getFullYear()) {
          const month = months[date.getMonth()];
          monthData[month].novosLeads++;
          
          if (lead.status === 'Aluno') {
            monthData[month].convertidos++;
          }
        }
      });
      
      // Contar sessões por mês
      sessions.forEach(session => {
        const date = new Date(session.startTime);
        if (date.getFullYear() === today.getFullYear()) {
          const month = months[date.getMonth()];
          monthData[month].sessoes++;
        }
      });
      
      // Converter para array
      months.forEach(month => {
        generatedData.push(monthData[month]);
      });
    } else {
      // Dados diários para 7d ou 30d
      const dateFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
      const dailyData: Record<string, LeadTimeData> = {};
      
      dates.forEach(date => {
        const dayName = dateFormat.format(date).slice(0, 3);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        dailyData[dateKey] = { 
          name: dayName, 
          novosLeads: 0, 
          convertidos: 0,
          sessoes: 0 
        };
      });
      
      // Contar leads por dia
      leads.forEach(lead => {
        const leadDate = new Date(lead.entryDate);
        const dateKey = leadDate.toISOString().split('T')[0];
        
        if (dailyData[dateKey]) {
          dailyData[dateKey].novosLeads++;
          
          if (lead.status === 'Aluno') {
            dailyData[dateKey].convertidos++;
          }
        }
      });
      
      // Contar sessões por dia
      sessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        const dateKey = sessionDate.toISOString().split('T')[0];
        
        if (dailyData[dateKey]) {
          dailyData[dateKey].sessoes++;
        }
      });
      
      // Converter para array mantendo a ordem das datas
      dates.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          generatedData.push(dailyData[dateKey]);
        }
      });
    }
    
    setChartData(generatedData);
  }, [leads, sessions, timeRange]);
  
  // Custom tooltip para melhor apresentação
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-md dark:shadow-glow-xs rounded p-2 text-xs sm:text-sm border border-gray-100 dark:border-primary/30">
          <p className="font-semibold text-gray-800 dark:text-gray-200 dark:glow-text-subtle mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              <span className="font-medium">{entry.name}:</span> 
              <span className="dark:glow-text-subtle">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Se estiver carregando ou não houver dados
  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex justify-end mb-2 sm:mb-4">
          <div className="relative group">
            <select 
              className="text-xs sm:text-sm border rounded px-2 py-1 text-gray-700 dark:bg-slate-800 dark:border-primary/30 dark:text-gray-300 focus:outline-none dark:focus:ring-1 dark:focus:ring-primary/50 dark:focus:shadow-glow-xs transition-all duration-200 dark:hover:border-primary/50 pr-6 appearance-none opacity-70 cursor-pointer"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              disabled
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="year">Este ano</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 transition-colors duration-200">
              <span className="material-icons text-sm">expand_more</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary dark:border-pink-400 dark:shadow-glow-sm"></div>
            <div className="text-gray-500 dark:text-gray-400 text-sm dark:glow-text-subtle">
              Carregando dados...
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end mb-2 sm:mb-4">
        <div className="relative group">
          <select 
            className="text-xs sm:text-sm border rounded px-2 py-1 text-gray-700 dark:bg-slate-800 dark:border-primary/30 dark:text-gray-300 focus:outline-none dark:focus:ring-1 dark:focus:ring-primary/50 dark:focus:shadow-glow-xs transition-all duration-200 dark:hover:border-primary/50 pr-6 appearance-none cursor-pointer"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="year">Este ano</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 dark:group-hover:text-primary/80 transition-colors duration-200">
            <span className="material-icons text-sm">expand_more</span>
          </div>
        </div>
      </div>
      
      <div className="w-full overflow-auto pb-2 flex-1">
        <div className="min-w-[320px] xs:min-w-[400px] sm:min-w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke={darkMode ? '#374151' : '#e5e7eb'}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: darkMode ? '#374151' : '#e5e7eb' }} 
                stroke={darkMode ? '#6B7280' : '#9CA3AF'}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: darkMode ? '#374151' : '#e5e7eb' }}
                stroke={darkMode ? '#6B7280' : '#9CA3AF'}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                iconType="circle"
              />
              <Line 
                type="monotone" 
                dataKey="novosLeads" 
                name="Novos Leads" 
                stroke="#E91E63" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, className: darkMode ? 'drop-shadow-glow' : '' }}
                className={darkMode ? 'drop-shadow-glow' : ''}
              />
              <Line 
                type="monotone" 
                dataKey="convertidos" 
                name="Convertidos" 
                stroke="#311B92" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6, className: darkMode ? 'drop-shadow-glow-secondary' : '' }}
                className={darkMode ? 'drop-shadow-glow-secondary' : ''}
              />
              <Line 
                type="monotone" 
                dataKey="sessoes" 
                name="Sessões" 
                stroke="#009688" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
