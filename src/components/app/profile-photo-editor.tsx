'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { PlayerProfile } from '@/lib/types';
import { Camera, Upload, User, Check, X, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUser } from '@/hooks/use-session-user';
import { revalidateCollection } from '@/hooks/use-mongo-collection';
interface ProfilePhotoEditorProps {
  playerProfile: PlayerProfile | null;
}

// Redimensiona y comprime a JPEG. Sin esto, una foto de móvil (5-12 MB) se
// guardaba como base64 de ~16 MB y superaba el límite de documento de MongoDB →
// la subida fallaba en silencio en el móvil. Queda en ~30-80 KB.
function resizeDataUrl(dataUrl: string, max = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No se pudo procesar la imagen.'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = dataUrl;
  });
}

export default function ProfilePhotoEditor({ playerProfile }: ProfilePhotoEditorProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [tempPhoto, setPrefPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();  const { user, uid } = useUser();

  const currentPhoto = playerProfile?.axiomAvatarDataUrl || playerProfile?.photoURL || '';

  const getCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 1 } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acceso a Cámara Denegado',
        description: 'Por favor, permite el acceso a la cámara en los ajustes de tu navegador.',
      });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const startCamera = () => {
    setIsCameraOpen(true);
    getCameraPermission();
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        resizeDataUrl(dataUrl).then(setPrefPhoto).catch(() => setPrefPhoto(dataUrl));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Selecciona una imagen.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const resized = await resizeDataUrl(reader.result as string);
        setPrefPhoto(resized);
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la imagen. Prueba con otra.' });
      }
    };
    reader.onerror = () => {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo leer el archivo.' });
    };
    reader.readAsDataURL(file);
    // Permite volver a elegir el mismo archivo si hace falta.
    e.target.value = '';
  };

  const savePhoto = async () => {
    if (!tempPhoto || !user || !uid) return;

    setIsSaving(true);
    try {
      // Escritura AWAIT (no fire-and-forget) para mostrar un error real si falla,
      // en vez de decir "guardado" cuando no lo está.
      const res = await fetch('/api/data/playerProfile/main-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ axiomAvatarDataUrl: tempPhoto, merge: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      revalidateCollection('playerProfile');
      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil se ha guardado correctamente.',
      });
      setPrefPhoto(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo guardar la imagen. Inténtalo de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Foto de Perfil</CardTitle>
        <CardDescription>Actualiza tu imagen de jugador para el sistema Axiom.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-square w-full rounded-lg border bg-muted flex items-center justify-center overflow-hidden group">
          
          {/* Display logic */}
          {tempPhoto ? (
            <Image src={tempPhoto} alt="Vista previa" width={400} height={400} className="object-cover h-full w-full" />
          ) : isCameraOpen ? (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          ) : currentPhoto ? (
            <Image src={currentPhoto} alt="Foto actual" width={400} height={400} className="object-cover h-full w-full" />
          ) : (
            <User className="h-24 w-24 text-muted-foreground" />
          )}

          {/* Action overlays */}
          {isCameraOpen && hasCameraPermission && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              <Button size="sm" variant="default" onClick={takePhoto}>
                <Camera className="mr-2 h-4 w-4" /> Capturar
              </Button>
              <Button size="sm" variant="secondary" onClick={stopCamera}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {isCameraOpen && hasCameraPermission === false && (
            <Alert variant="destructive">
                <AlertTitle>Cámara Requerida</AlertTitle>
                <AlertDescription>
                    Por favor, permite el acceso a la cámara para usar esta función.
                </AlertDescription>
            </Alert>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <div className="grid grid-cols-2 gap-2">
          {!isCameraOpen && !tempPhoto && (
            <>
              <Button variant="outline" onClick={startCamera} className="gap-1.5 h-11">
                <Camera className="h-4 w-4 shrink-0" /><span className="truncate">Cámara</span>
              </Button>
              {/* Label con el input dentro: tocar cualquier parte abre el selector
                  de forma nativa (gesto directo), mucho más fiable en móvil que un
                  .click() programático sobre un input oculto. */}
              <Button asChild variant="outline" className="gap-1.5 h-11 cursor-pointer">
                <label>
                  <Upload className="h-4 w-4 shrink-0" /><span className="truncate">Subir foto</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
            </>
          )}

          {tempPhoto && (
            <>
              <Button variant="default" className="h-11" onClick={savePhoto} disabled={isSaving}>
                <Check className="mr-2 h-4 w-4" /> {isSaving ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button variant="ghost" className="h-11" onClick={() => setPrefPhoto(null)} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Descartar
              </Button>
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 py-3">
        <p className="text-[10px] text-muted-foreground leading-tight">
            Usa una foto clara. Tu imagen se utiliza para personalizar el núcleo del Dashboard y las notificaciones.
        </p>
      </CardFooter>
    </Card>
  );
}
