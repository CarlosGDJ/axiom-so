'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserData } from '@/lib/types';

interface ExportPdfButtonProps {
  userData: UserData;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export default function ExportPdfButton({
  userData,
  variant = 'outline',
  size = 'sm',
  className,
}: ExportPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { exportWeeklySummaryPDF } = await import('@/lib/export-pdf');
      await exportWeeklySummaryPDF(userData);
      toast({ title: 'PDF generado', description: 'El resumen semanal se ha descargado correctamente.' });
    } catch (err) {
      console.error('PDF export failed:', err);
      toast({
        title: 'Error al generar PDF',
        description: 'No se pudo generar el documento. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {isGenerating ? 'Generando...' : 'Exportar PDF'}
    </Button>
  );
}
