
interface KpiCardProps {
  title: string;
  value: number | string;
  icon: string;
  change: number;
  iconBgColor: string;
  iconColor: string;
}

import { Card } from "@/components/ui/card";

export default function KpiCard({ 
  title, 
  value, 
  icon, 
  change, 
  iconBgColor, 
  iconColor 
}: KpiCardProps) {
  return (
    <Card variant="glowIntenseLifted" className="p-4 sm:p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight dark:text-white dark:glow-value">{value}</p>

          <div className={`flex flex-wrap items-center ${change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className="material-icons text-sm">
              {change >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            <span className="ml-1 text-sm font-medium dark:glow-text-subtle">{Math.abs(change)}%</span>
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 hidden xs:inline">vs último mês</span>
          </div>
        </div>

        <div className={`${iconBgColor} dark:bg-opacity-20 p-2 sm:p-3 rounded-lg dark:border dark:border-primary/30 dark:shadow-glow-xs`}>
          <span className={`material-icons text-base sm:text-lg ${iconColor} dark:glow-text-subtle`}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}
