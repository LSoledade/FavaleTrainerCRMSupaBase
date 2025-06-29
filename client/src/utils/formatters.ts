import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Format date to Brazilian format (DD/MM/YYYY)
export function formatDate(date: string | Date): string {
  try {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return format(parsedDate, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Data inválida";
  }
}

// Format currency to Brazilian format (R$ 1.000,00)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// Format phone number (11) 98765-4321
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove non-numeric characters
  const numericOnly = phone.replace(/\D/g, "");
  
  if (numericOnly.length === 11) {
    // Format as (XX) XXXXX-XXXX (mobile)
    return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 7)}-${numericOnly.substring(7)}`;
  } else if (numericOnly.length === 10) {
    // Format as (XX) XXXX-XXXX (landline)
    return `(${numericOnly.substring(0, 2)}) ${numericOnly.substring(2, 6)}-${numericOnly.substring(6)}`;
  }
  
  // Return original if not recognized format
  return phone;
}
