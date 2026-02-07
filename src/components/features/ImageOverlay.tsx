import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ImageOverlayProps {
  src: string;
  alt: string;
}

export function ImageOverlay({ src, alt }: ImageOverlayProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* A imagem pequena onde o utilizador clica */}
        <img 
          src={src} 
          alt={alt} 
          className="cursor-pointer hover:opacity-90 transition-opacity rounded-lg object-cover w-full h-full" 
        />
      </DialogTrigger>
      
      {/* O fundo escuro e a foto grande (estilo Facebook) */}
      <DialogContent className="max-w-[95vw] max-h-[95vh] border-none bg-transparent p-0 shadow-none">
        <div className="relative flex items-center justify-center w-full h-full">
          <img 
            src={src} 
            alt={alt} 
            className="max-w-full max-h-[90vh] object-contain rounded-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}