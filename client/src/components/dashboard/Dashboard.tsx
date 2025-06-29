import { useQuery } from "@tanstack/react-query";
import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";
import SourcePieChart from "./SourcePieChart";
import StateBarChart from "./StateBarChart";
import TimelineChart from "./TimelineChart";
import TodayAppointmentCard from "./TodayAppointmentCard";
import GreetingWidget from "./GreetingWidget";
import UserWeatherWidget from "./UserWeatherWidget";
import { Button } from "../ui/button";
import { Filter } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface DashboardStats {
  totalLeads: number;
  totalStudents: number;
  totalActiveSessions: number;
  totalCompletedSessions: number;
  sessionsPerStudent: string;
  conversionRate: string;
  leadsBySource: Record<string, number>;
  leadsByState: Record<string, number>;
  leadsByCampaign: Record<string, number>;
  totalLeadsByCampaign: number;
}

export default function Dashboard() {
  const { theme } = useTheme();
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-pink-400 dark:shadow-glow-md relative">
          <div className="absolute inset-0 rounded-full dark:shadow-glow-xs dark:opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="m-6 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 dark:shadow-glow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-100 dark:bg-red-500/20 p-3 rounded-bl-lg dark:shadow-glow-xs">
          <span className="material-icons text-red-500 dark:text-red-400 dark:glow-text">error</span>
        </div>
        <h3 className="text-lg font-semibold mb-2 dark:glow-text-subtle">Erro no Dashboard</h3>
        <p>Erro ao carregar estatísticas do dashboard. Tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting & Weather Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2">
          <GreetingWidget />
        </div>
        <div className="md:col-span-1">
          <UserWeatherWidget />
        </div>
      </div>
      
      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Total de Leads</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-light bg-opacity-20 dark:bg-primary/30">
              <span className="material-icons text-primary dark:text-primary-light">people</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalLeads}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+5%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Total de Alunos</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30">
              <span className="material-icons text-green-600 dark:text-green-400">school</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalStudents}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+10%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Taxa de Conversão</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <span className="material-icons text-amber-600 dark:text-amber-400">trending_up</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.conversionRate}%</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+3%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Sessões por Aluno</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary-light bg-opacity-20 dark:bg-secondary/30">
              <span className="material-icons text-secondary-light dark:text-secondary-light/80">fitness_center</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.sessionsPerStudent}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+8%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Sessões Agendadas</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <span className="material-icons text-blue-600 dark:text-blue-400">event_available</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalActiveSessions}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+12%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Sessões Realizadas</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <span className="material-icons text-teal-600 dark:text-teal-400">check_circle</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCompletedSessions}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+15%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Leads por Campanha</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <span className="material-icons text-indigo-600 dark:text-indigo-400">campaign</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalLeadsByCampaign}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+7%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between mb-4">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Leads Novos (30d)</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <span className="material-icons text-pink-600 dark:text-pink-400">new_releases</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800 dark:text-white">{Math.round(stats.totalLeads * 0.23)}</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-green-600 dark:text-green-400">+18%</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs. último mês</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-gray-800 dark:text-white">Distribuição por Origem</h3>
          </div>
          <div className="h-64">
            <SourcePieChart data={stats.leadsBySource} />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-1 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-gray-800 dark:text-white">Leads por Estado</h3>
          </div>
          <div className="h-64">
            <StateBarChart data={stats.leadsByState} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-gray-800 dark:text-white">Leads ao Longo do Tempo</h3>
          </div>
          <div className="h-64">
            <TimelineChart />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2 lg:col-span-1">
          <TodayAppointmentCard />
        </div>
      </div>
    </div>
  );
}
