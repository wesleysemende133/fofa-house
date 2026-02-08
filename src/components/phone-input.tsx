import 'react-phone-number-input/style.css'
import PhoneInput from 'react-phone-number-input'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Função utilitária para combinar classes (comum em projetos shadcn)
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function ContactPhoneInput({ value, onChange, className }: any) {
  return (
    <div className={cn("relative", className)}>
      <PhoneInput
        international
        defaultCountry="MZ"
        displayDefaultCode={true} 
        placeholder="84 123 4567"
        value={value}
        onChange={onChange}
        // Removemos as bordas internas do PhoneInput para não criar o "retângulo duplo"
        className="flex items-center w-full focus-within:outline-none"
        // Estilizamos o input real para ser invisível (sem bordas próprias)
        numberInputProps={{
          className: "bg-transparent border-none focus:ring-0 w-full outline-none px-2 py-2 text-sm"
        }}
      />
    </div>
  )
}