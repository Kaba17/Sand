import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadFile } from '@/hooks/use-claims';

interface FileUploadProps {
  onUploadComplete: (fileData: { id: string; url: string; fileName: string }) => void;
  className?: string;
}

export function FileUpload({ onUploadComplete, className }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const uploadMutation = useUploadFile();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        setUploadedFiles(prev => [...prev, result]);
        onUploadComplete(result);
      } catch (error) {
        console.error("Upload failed", error);
      }
    }
  }, [uploadMutation, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxSize: 5 * 1024 * 1024, // 5MB
    accept: {
      'image/*': [],
      'application/pdf': []
    }
  });

  return (
    <div className={cn("w-full", className)}>
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer text-center",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploadMutation.isPending && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploadMutation.isPending ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : (
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium font-tajawal">
              {isDragActive ? "أفلت الملفات هنا" : "اضغط للرفع أو اسحب الملفات هنا"}
            </p>
            <p className="text-xs text-muted-foreground font-tajawal">
              الصور (JPG, PNG) أو مستندات PDF بحجم أقصى 5 ميجابايت
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
              {file.fileName.endsWith('.pdf') ? (
                <FileText className="h-5 w-5 text-blue-500" />
              ) : (
                <ImageIcon className="h-5 w-5 text-purple-500" />
              )}
              <span className="text-sm font-medium flex-1 truncate font-tajawal">{file.fileName}</span>
              <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
