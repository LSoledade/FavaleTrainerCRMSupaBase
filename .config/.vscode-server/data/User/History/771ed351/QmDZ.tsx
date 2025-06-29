import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  expanded?: boolean;
}

export default function Sidebar({ open, setOpen, expanded = true }: SidebarProps) {
  const [location] = useLocation();
  const { theme } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Verificar se é mobile ao inicializar
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Itens de navegação padrão
  let navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/leads", label: "Leads", icon: "people" },
    { path: "/agendamentos", label: "Agendamentos", icon: "calendar_today" },
    { path: "/calendario", label: "Calendário", icon: "event" },
    { path: "/tarefas", label: "Tarefas", icon: "assignment" },
    { path: "/whatsapp", label: "WhatsApp", icon: "chat" },
    { path: "/favale-ia", label: "FavaleIA", icon: "psychology" },
    { path: "/config", label: "Configurações", icon: "settings" },
  ];
  
  
  const getNavClasses = (path: string) => {
    const isActive = location === path;
    const baseClasses = "flex items-center text-white transition-all duration-300 rounded-md my-2";
    
    return isActive 
      ? `${baseClasses} bg-gray-700 ${expanded ? 'px-4 mx-3' : 'justify-center mx-2 w-10 h-10'} py-2`
      : `${baseClasses} hover:bg-gray-700/50 ${expanded ? 'px-4 mx-3' : 'justify-center mx-2 w-10 h-10'} py-2`;
  };
  
  return (
    <>
      {/* Mobile/Desktop sidebar */}
      <aside 
        className={`${expanded ? 'w-64' : 'w-16'} bg-gray-900 text-white lg:block flex-shrink-0 fixed lg:relative inset-y-0 left-0 transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-all duration-300 ease-in-out z-30 h-full flex flex-col overflow-hidden rounded-tr-xl rounded-br-xl shadow-lg`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800 relative">
          {expanded ? (
            <div className="font-heading text-xl font-bold text-white/90">
              FavaleTrainer
            </div>
          ) : (
            <div className="font-heading text-xl font-bold text-center w-full text-white/90">
              FT
            </div>
          )}
        </div>
        
        <div className="px-3 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
          {expanded && "MAIN MENU"}
        </div>
        
        <nav className="py-2 overflow-y-auto flex-grow px-1">
          <ul className={`space-y-1 ${!expanded ? 'flex flex-col items-center' : ''}`}>
            {navItems.map((item) => (
              <li key={item.path} className={!expanded ? 'w-full flex justify-center' : ''}>
                <Link 
                  href={item.path}
                  onClick={() => setOpen(false)}
                  className={getNavClasses(item.path)}
                  title={!expanded ? item.label : undefined}
                >
                  <span className={`material-icons text-base ${expanded ? 'mr-3' : ''} transition-all duration-300 ${location === item.path ? 'text-white' : 'text-gray-400'}`}>{item.icon}</span>
                  {expanded && <span className={`text-sm font-medium ${location === item.path ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User Profile Section */}
        {user && (
          <div className="mt-auto border-t border-gray-800 p-4 sticky bottom-0 bg-gray-900/95 backdrop-blur-sm">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`flex items-center w-full ${expanded ? 'justify-between' : 'justify-center'} text-white hover:bg-gray-800 rounded-md p-2 transition-all duration-200 group`}
                  title={!expanded ? "Perfil de usuário" : undefined}
                >
                  <div className="flex items-center">
                    <Avatar className={`${expanded ? 'h-8 w-8' : 'h-9 w-9'} bg-gray-700 transition-all duration-200`}>
                      <AvatarFallback className="text-sm font-medium text-white">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {expanded && (
                      <div className="ml-3 flex flex-col">
                        <span className="text-sm font-medium">{user.username}</span>
                        <span className="text-xs text-gray-400">{user.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                      </div>
                    )}
                  </div>
                  {expanded && (
                    <span className="material-icons text-sm text-gray-400 group-hover:text-white/90 transition-all">expand_more</span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 animate-in slide-in-from-bottom-5 duration-200">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/config" onClick={() => setOpen(false)}>
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4 opacity-70" />
                    <span className="text-sm">Perfil e Configurações</span>
                  </DropdownMenuItem>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/config" onClick={() => {
                    setOpen(false);
                  }}>
                    <DropdownMenuItem className="cursor-pointer">
                      <Shield className="mr-2 h-4 w-4 opacity-70" />
                      <span className="text-sm">Segurança</span>
                    </DropdownMenuItem>
                  </Link>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="cursor-pointer text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4 opacity-70" />
                  <span className="text-sm">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>
      
      {/* Background overlay for mobile sidebar */}
      {open && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden transition-all duration-300" 
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
