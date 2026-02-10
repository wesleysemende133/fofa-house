import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { cn } from '@/lib/utils';

// Função utilitária para combinar classes (comum em projetos shadcn)
export function ContactPhoneInput({ value, onChange, className }: any) {
  const handleChange = (newValue: string | undefined) => {
    if (!newValue) {
      onChange("");
      return;
    }

    // Se o valor começar com +258258, corrigimos para apenas um +258
    let cleaned = newValue;
    if (cleaned.startsWith('+258258')) {
      cleaned = '+' + cleaned.substring(4);
    }
    
    onChange(cleaned);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <PhoneInput
        international = {false}
        defaultCountry="MZ"
        placeholder="84 123 4567"
        value={value}
        onChange={handleChange} // Usamos a função de limpeza aqui
        className="flex items-center w-full focus-within:outline-none"
        numberInputProps={{
          className: "bg-transparent border-none focus:ring-0 w-full outline-none px-2 py-2 text-sm"
        }}
      />
    </div>
  )
}