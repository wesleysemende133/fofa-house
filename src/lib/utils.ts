import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-MZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function getPropertyTypeLabel(type: string): string {
  const types: Record<string, string> = {
    house: 'Casa',
    room: 'Quarto',
    barraca: 'Barraca',
    land: 'Terreno',
    commercial: 'Loja Comercial',
    warehouse: 'Armazém',
  };
  return types[type] || type;
}

export function getListingTypeLabel(type: string): string {
  return type === 'sale' ? 'Venda' : 'Aluguer';
}
