import { format, parseISO, formatRelative } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export const defaultLocale = 'pt-BR';

export const formatDate = (date: string | Date, dateFormat: string = "P"): string => {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return format(parsedDate, dateFormat, { locale: ptBR });
};

// Example usage: há 3 minutos
export const formatRelativeDate = (date: string | Date): string => {
    const parsedDate = typeof date === "string" ? parseISO(date) : date;
    return formatRelative(parsedDate, new Date(), { locale: ptBR });
};