import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SourcePieChartProps {
  data: Record<string, number>;
}

export default function SourcePieChart({ data }: SourcePieChartProps) {
  // Check if running in browser environment
  const isBrowser = typeof window !== 'undefined';
  const isMobile = isBrowser ? window.innerWidth < 640 : false;
  // Format data for chart
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: key,
      value: value
    }));
  
  // Calculate percentages
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const formattedData = chartData.map(item => ({
    ...item,
    percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
  }));
  
  // Define colors for the sources
  const COLORS = ['#ff9810', '#ed0180', '#FF5722', '#009688', '#3F51B5', '#FFC107'];
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 shadow-md dark:shadow-black/30 rounded p-2 text-xs sm:text-sm border border-gray-100 dark:border-gray-700">
          <p className="font-semibold text-gray-800 dark:text-gray-200">{payload[0].name}</p>
          <p className="text-gray-600 dark:text-gray-300">Leads: {payload[0].value}</p>
          <p className="text-gray-600 dark:text-gray-300">{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={isMobile ? 60 : 80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percentage }) => (
              isMobile ? 
              `${percentage}%` : 
              `${name} (${percentage}%)`
            )}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{
              fontSize: isMobile ? 10 : 12,
              paddingTop: 15
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
