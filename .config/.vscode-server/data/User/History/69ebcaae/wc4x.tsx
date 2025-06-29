import { useLocation, Link } from "wouter";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Bell, HelpCircle, Sun, Moon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logoutMutation } = useAuth();
  
  const getPageTitle = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/leads":
        return "Gerenciamento de Leads";
      case "/agendamentos":
        return "Agendamentos";
      case "/campanhas":
        return "Campanhas";
      case "/config":
        return "Configurações";
      case "/usuarios":
        return "Usuários";
      case "/relatorios":
        return "Relatórios";
      case "/financeiro":
        return "Financeiro";
      case "/produtos":
        return "Produtos";
      case "/clientes":
        return "Clientes";
      case "/tarefas":
        return "Tarefas";
      case "/notificacoes":
        return "Notificações";
      case "/ajuda":
        return "Ajuda";
      default:
        return "FavaleTrainer";
    }
  };
  
  return (
    <header className="h-16 flex items-center justify-between z-10 mb-2">
      <div className="flex items-center">
        <button 
          className="lg:hidden mr-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="material-icons text-gray-600 dark:text-gray-300">menu</span>
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
          {getPageTitle()}
        </h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
        >
          <Bell className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleTheme}
          className="font-normal text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 flex items-center gap-1 h-9"
          title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center cursor-pointer ml-2">
              <Avatar className="h-9 w-9 border-2 border-white dark:border-gray-800 ring-2 ring-gray-200 dark:ring-gray-700">
                <AvatarFallback className="text-sm font-medium text-white bg-gray-700">
                  {user?.username.substring(0, 2).toUpperCase() || "LW"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 hidden sm:block">
                <div className="text-sm font-medium text-gray-800 dark:text-white">{user?.username || "Leslie Watson"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/config">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil e Configurações</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
