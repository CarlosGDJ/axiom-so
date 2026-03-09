'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Camera, Upload, User, Check, X, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProfilePhotoEditorProps {
  userProfile: UserProfile | null;
}

export default function ProfilePhotoEditor({ userProfile }: ProfilePhotoEditorProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [tempPhoto, setPrefPhoto] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const currentPhoto = userProfile?.axiomAvatarDataUrl || userProfile?.photoURL || '';

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
        setPrefPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrefPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const savePhoto = async () => {
    if (!tempPhoto || !user || !firestore) return;

    setIsSaving(true);
    try {
      const userRef = doc(firestore, `users/${user.uid}`);
      setDocumentNonBlocking(userRef, { axiomAvatarDataUrl: tempPhoto }, { merge: true });

      toast({
        title: 'Foto Actualizada',
        description: 'Tu foto de perfil ha sido guardada correctamente.',
      });
      setPrefPhoto(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: 'No se pudo guardar la imagen.',
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
        <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
        />

        <div className="grid grid-cols-2 gap-2">
          {!isCameraOpen && !tempPhoto && (
            <>
              <Button variant="outline" onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" /> Cámara
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Subir
              </Button>
            </>
          )}

          {tempPhoto && (
            <>
              <Button variant="default" onClick={savePhoto} disabled={isSaving}>
                <Check className="mr-2 h-4 w-4" /> {isSaving ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button variant="ghost" onClick={() => setPrefPhoto(null)} disabled={isSaving}>
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
