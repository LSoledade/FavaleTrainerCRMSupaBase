import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useWhatsappContext } from "@/context/WhatsappContext";
import WhatsappModal from "./whatsapp/WhatsappModal";
import { useTheme } from "@/components/theme-provider";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { isWhatsappOpen, selectedLeadForWhatsapp, closeWhatsappChat } = useWhatsappContext();
  const { theme } = useTheme();
  
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
  
  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} expanded={sidebarExpanded} />
      
      {/* Botão de expandir/recolher fixo */}
      {!isMobile && (
        <button 
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="fixed left-3 bottom-24 z-[9999] p-1 rounded-full hover:bg-secondary-light dark:hover:bg-gray-700 transition-all duration-300 bg-secondary/90 dark:bg-gray-800 border-2 border-gray-400 dark:border-gray-600 w-10 h-10 flex items-center justify-center hover:scale-110 shadow-lg"
          title="Alternar menu"
        >
          <span className="material-icons text-white text-base font-bold">
            {sidebarExpanded ? "chevron_left" : "menu"}
          </span>
        </button>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4">
        <Header setSidebarOpen={setSidebarOpen} />
        <div className="flex-1 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* WhatsApp Modal */}
      <WhatsappModal 
        isOpen={isWhatsappOpen} 
        onClose={closeWhatsappChat} 
        lead={selectedLeadForWhatsapp} 
      />
    </div>
  );
}
