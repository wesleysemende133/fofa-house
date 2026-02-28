import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoUploaderProps {
  userId: string;
  photos: string[];
  onChange: (newPhotos: string[]) => void;
  maxPhotos?: number;
}

export default function PhotoUploader({ userId, photos, onChange, maxPhotos = 10 }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      toast({ title: "Limite atingido", description: `Máximo de ${maxPhotos} fotos.`, variant: "destructive" });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);
    setUploading(true);

    const uploadedUrls: string[] = [];
    const options = { 
      maxSizeMB: 0.6, 
      maxWidthOrHeight: 1600, 
      useWebWorker: true,
      fileType: 'image/jpeg' as const
    };

    try {
      for (let i = 0; i < filesToProcess.length; i++) {
        let file = filesToProcess[i];
        
        // Comprimir se for imagem grande
        if (file.size > 300 * 1024) {
          file = await imageCompression(file, options);
        }

        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("property-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        setCurrentProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
      }

      onChange([...photos, ...uploadedUrls]);
      toast({ title: "Sucesso" });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setCurrentProgress(0);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {/* Lista de fotos carregadas */}
        {photos.map((url, index) => (
          <div key={index} className="relative aspect-square rounded-md overflow-hidden border bg-slate-50 group">
            <img src={url} alt="Imóvel" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removePhoto(index)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Botão de adição */}
        {photos.length < maxPhotos && (
          <label className={`
            relative aspect-square flex flex-col items-center justify-center 
            border-2 border-dashed rounded-md cursor-pointer transition-all
            ${uploading ? 'bg-slate-50 border-slate-200' : 'hover:bg-blue-50 border-slate-300 hover:border-blue-400'}
          `}>
            {uploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-[10px] font-bold mt-2">{currentProgress}%</span>
              </div>
            ) : (
              <>
                <Plus className="h-6 w-6 text-slate-400" />
                <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Adicionar</span>
              </>
            )}
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={handleUpload} 
              disabled={uploading} 
            />
          </label>
        )}
      </div>
    </div>
  );
}