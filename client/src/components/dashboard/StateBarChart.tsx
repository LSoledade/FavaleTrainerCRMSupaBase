import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect } from 'react';

interface StateBarChartProps {
  data: Record<string, number>;
}

export default function StateBarChart({ data }: StateBarChartProps) {
  const [darkMode, setDarkMode] = useState(false);

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

  // Format data for chart
  const chartData = Object.entries(data || {})
    .filter(([_, count]) => count > 0)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7); // Take top 7 states
  
  // Cores para barras no tema claro e escuro
  const barColors = darkMode ? 
    ['#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F', '#6A0E4F', '#5D0E4F'] : 
    ['#E91E63', '#EC407A', '#F06292', '#F48FB1', '#F8BBD0', '#FCE4EC', '#FFEBEE'];
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-md dark:shadow-primary/20 rounded p-2 text-xs sm:text-sm border border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-gray-600 dark:text-gray-300">Leads: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };
  
  // Se não houver dados, mostre uma mensagem
  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
        Não há dados de estados para mostrar
      </div>
    );
  }
  
  return (
    <div className="w-full overflow-auto pb-2 h-full">
      <div className="min-w-[320px] xs:min-w-[400px] sm:min-w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <XAxis 
              dataKey="state" 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: darkMode ? '#374151' : '#e5e7eb' }}
              stroke={darkMode ? '#6B7280' : '#9CA3AF'}
            />
            <YAxis 
              tickFormatter={(value) => value.toString()} 
              tick={{ fontSize: 12 }} 
              tickLine={false}
              axisLine={{ stroke: darkMode ? '#374151' : '#e5e7eb' }}
              stroke={darkMode ? '#6B7280' : '#9CA3AF'}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="count" 
              barSize={20} 
              radius={[4, 4, 0, 0]}
              className="dark:drop-shadow-glow"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={barColors[index % barColors.length]} 
                  className={darkMode ? 'drop-shadow-glow' : ''}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
