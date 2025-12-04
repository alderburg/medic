import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
      return "Horário inválido";
    }
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  } catch (error) {
    return "Horário inválido";
  }
}

export function formatDate(date: string | Date): string {
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return "Data inválida";
    }
    return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    return "Data inválida";
  }
}