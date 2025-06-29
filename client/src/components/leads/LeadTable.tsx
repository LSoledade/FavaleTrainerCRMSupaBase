import { useState, useEffect } from "react";
import { Lead } from "@shared/schema";
import { useLeadContext } from "@/context/LeadContext";
import { useWhatsappContext } from "@/context/WhatsappContext";
import { formatDate } from "@/utils/formatters";
import WhatsappButton from "../whatsapp/WhatsappButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onDelete: (lead: Lead) => void;
  indexOfFirstLead?: number;
}

export default function LeadTable({ leads, isLoading, onDelete, indexOfFirstLead: externalIndexOfFirstLead }: LeadTableProps) {
  const { 
    setSelectedLead, 
    setIsDialogOpen,
    selectedLeadIds,
    setSelectedLeadIds 
  } = useLeadContext();
  const { openWhatsappChat } = useWhatsappContext();
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;
  const [selectMode, setSelectMode] = useState<'page' | 'all'>('page');
  
  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };
  
  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds([...selectedLeadIds, leadId]);
    } else {
      setSelectedLeadIds(selectedLeadIds.filter(id => id !== leadId));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      if (selectMode === 'page') {
        // Selecionar apenas os leads da página atual
        const allPageIds = currentLeads.map(lead => lead.id);
        setSelectedLeadIds(allPageIds);
      } else {
        // Selecionar todos os leads
        const allIds = leads.map(lead => lead.id);
        setSelectedLeadIds(allIds);
      }
    } else {
      setSelectedLeadIds([]);
    }
  };
  
  // Calculate pagination
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(leads.length / leadsPerPage);
  
  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pageNumbers.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pageNumbers.push('...');
    }
  }
  
  // Remove duplicate ellipses
  const displayPageNumbers = pageNumbers.filter((number, index, self) => {
    return number === '...' ? self.indexOf(number) === index : true;
  });
  
  const getStatusBadgeClasses = (status: string) => {
    return status === "Aluno" 
      ? "inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 transition-colors duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 transform"
      : "inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 transition-colors duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 transform";
  };
  
  const getSourceBadgeClasses = (source: string) => {
    return source === "Favale" 
      ? "inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-pink-100 text-primary dark:bg-pink-900/30 dark:text-pink-400 transition-colors duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 transform"
      : "inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-purple-100 text-secondary dark:bg-purple-900/30 dark:text-purple-400 transition-colors duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 transform";
  };
  
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-6 flex justify-center items-center transition-all duration-200 min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-primary dark:border-t-primary-light dark:shadow-glow-xs"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 overflow-hidden transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 transition-colors duration-200">
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 rounded border-primary/30 text-primary focus:ring-primary/30 transition-all duration-200"
                  checked={currentLeads.length > 0 && currentLeads.every(lead => selectedLeadIds.includes(lead.id))}
                  onChange={(e) => {
                    setSelectMode('page');
                    handleSelectAll(e.target.checked);
                  }}
                />
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                Data
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                Telefone
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                Estado
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                Campanha
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                Tags
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                Origem
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-2 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {currentLeads.length > 0 ? (
              currentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-all duration-200 hover:shadow-md dark:hover:shadow-gray-900/20">
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="h-3 w-3 sm:h-4 sm:w-4 rounded border-primary/30 text-primary focus:ring-primary/30 transition-all duration-200"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                    {formatDate(lead.entryDate)}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[100px] sm:max-w-none">{lead.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[100px] sm:max-w-none">{lead.email}</div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                    {lead.phone}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell">
                    {lead.state}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-300 hidden lg:table-cell">
                    {lead.campaign}
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags && lead.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-pink-300 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium transition-all duration-200 hover:bg-primary/20 dark:hover:bg-primary/30 dark:hover:shadow-glow-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                    <span className={getSourceBadgeClasses(lead.source)}>
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClasses(lead.status)}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    <div className="flex space-x-1 sm:space-x-3">
                      <WhatsappButton onClick={() => openWhatsappChat(lead)} />
                      <button 
                        className="p-1 sm:p-1.5 rounded-full text-indigo-600 hover:text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/30 transition-all duration-200"
                        onClick={() => handleEdit(lead)}
                        title="Editar"
                      >
                        <span className="material-icons text-xs sm:text-sm">edit</span>
                      </button>
                      <button 
                        className="p-1 sm:p-1.5 rounded-full text-red-600 hover:text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 transition-all duration-200"
                        onClick={() => onDelete(lead)}
                        title="Excluir"
                      >
                        <span className="material-icons text-xs sm:text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="transition-colors duration-200">
                <td colSpan={10} className="px-2 sm:px-6 py-2 sm:py-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {leads.length > 0 && (
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 justify-between border-t dark:border-gray-700">
          <div className="flex w-full sm:w-auto justify-between sm:hidden">
            <button 
              className="relative inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 hover:shadow-md dark:hover:shadow-glow-xs hover:-translate-y-0.5 transform"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <span className="inline-flex items-center text-xs text-gray-700 dark:text-gray-300">
              {currentPage} de {totalPages}
            </span>
            <button 
              className="relative inline-flex items-center px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary transition-all duration-200 hover:shadow-md dark:hover:shadow-glow-xs hover:-translate-y-0.5 transform"
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                Mostrando <span className="font-medium">{indexOfFirstLead + 1}</span> a{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastLead, leads.length)}
                </span>{" "}
                de <span className="font-medium">{leads.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button 
                  className="relative inline-flex items-center px-2 py-1.5 sm:py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-offset-gray-800 transition-all duration-200 dark:hover:shadow-glow-xs hover:-translate-y-0.5 transform"
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <span className="material-icons text-xs sm:text-sm">chevron_left</span>
                </button>
                {displayPageNumbers.map((number, index) => (
                  <button
                    key={index}
                    className={`relative inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium transition-all duration-200 ${
                      number === currentPage
                        ? "bg-primary text-white border-primary dark:border-primary dark:shadow-glow-sm"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 transform"
                    } focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-offset-gray-800 ${number !== '...' ? 'hover:shadow-md dark:hover:shadow-glow-xs' : ''}`}
                    onClick={() => number !== '...' && setCurrentPage(number as number)}
                    disabled={number === '...'}
                  >
                    {number}
                  </button>
                ))}
                <button 
                  className="relative inline-flex items-center px-2 py-1.5 sm:py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-offset-gray-800 transition-all duration-200 dark:hover:shadow-glow-xs hover:-translate-y-0.5 transform"
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="material-icons text-xs sm:text-sm">chevron_right</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
