
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Activity {
  id: string;
  type: "new" | "converted" | "campaign" | "updated" | "deleted";
  title: string;
  description: string;
  time: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

interface RecentActivityProps {
  className?: string;
}

import { Card } from "@/components/ui/card";

export default function RecentActivity({ className = "" }: RecentActivityProps) {
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const generateActivities = (leads: Lead[]): Activity[] => {
    const sortedLeads = [...leads].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const activities: Activity[] = sortedLeads.slice(0, 5).map((lead, index) => {
      const types: ("new" | "converted" | "updated" | "deleted")[] = ["new", "converted", "updated", "deleted"];
      const type = lead.status === "Aluno" ? "converted" : types[index % types.length];

      let title = "";
      let icon = "";
      let iconBgColor = "";
      let iconColor = "";

      switch (type) {
        case "new":
          title = `${lead.name} adicionado como novo lead`;
          icon = "person_add";
          iconBgColor = "bg-primary-light bg-opacity-20 dark:bg-pink-400/20";
          iconColor = "text-primary dark:text-white";
          break;
        case "converted":
          title = `${lead.name} convertido para aluno`;
          icon = "check_circle";
          iconBgColor = "bg-green-100 dark:bg-green-600/20";
          iconColor = "text-green-600 dark:text-white";
          break;
        case "updated":
          title = `${lead.name} atualizou informações de contato`;
          icon = "update";
          iconBgColor = "bg-amber-100 dark:bg-amber-600/20";
          iconColor = "text-amber-600 dark:text-white";
          break;
        case "deleted":
          title = `Lead ${lead.name} removido`;
          icon = "delete";
          iconBgColor = "bg-red-100 dark:bg-red-600/20";
          iconColor = "text-red-600 dark:text-white";
          break;
      }

      return {
        id: `activity-${lead.id}-${type}`,
        type,
        title,
        description: "",
        time: formatDistanceToNow(new Date(lead.updatedAt), { 
          addSuffix: true, 
          locale: ptBR 
        }),
        icon,
        iconBgColor,
        iconColor
      };
    });

    activities.splice(2, 0, {
      id: "activity-campaign",
      type: "campaign",
      title: "Nova campanha Verão 2023 iniciada",
      description: "",
      time: "Há 2 horas",
      icon: "campaign",
      iconBgColor: "bg-secondary-light bg-opacity-20 dark:bg-pink-400/20",
      iconColor: "text-secondary-light dark:text-white"
    });

    return activities.slice(0, 5);
  };

  const activities = leads ? generateActivities(leads) : [];

  return (
    <Card variant="glowIntenseLifted" className={`flex flex-col h-full p-3 sm:p-5 ${className}`}>
      <div className="flex justify-between items-center mb-3 sm:mb-4 border-b dark:border-primary/20 pb-3">
        <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white dark:glow-title">Atividades Recentes</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-secondary transition-all duration-200 dark:text-gray-300 dark:hover:text-pink-400 hover:scale-110 dark:hover:glow-text">
                <span className="material-icons text-base sm:text-lg">more_vert</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mais ações</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary dark:border-pink-400 dark:shadow-glow-sm"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start group hover:bg-gray-50 dark:hover:bg-slate-700/50 dark:hover:bg-opacity-30 p-2 rounded-lg transition-all duration-200 hover-lift-sm dark:border-l dark:border-transparent dark:hover:border-primary/30 dark:hover:shadow-glow-xs">
                <div className={`${activity.iconBgColor} rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 dark:shadow-glow-xs dark:border dark:border-primary/40 transition-all duration-200 group-hover:scale-110`}>
                  <span className={`material-icons text-xs sm:text-sm ${activity.iconColor} dark:glow-text-subtle`}>{activity.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs sm:text-sm dark:text-white dark:group-hover:glow-text-intense truncate cursor-help transition-all duration-300">{activity.title}</p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{activity.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-300 py-4">Nenhuma atividade recente</p>
        )}
      </div>
    </Card>
  );
}
