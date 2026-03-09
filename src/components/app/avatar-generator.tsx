'use client';

import { useState } from 'react';
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAIAvatar } from '@/lib/actions';
import type { UserProfile } from '@/lib/types';
import { useFirestore, setDocumentNonBlocking, useUser } from '@/firebase';

interface AvatarGeneratorProps {
  userProfile: UserProfile | null;
}

export default function AvatarGenerator({ userProfile }: AvatarGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const currentAvatar = generatedAvatar || userProfile?.axiomAvatarDataUrl || userProfile?.photoURL || null;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Descripción vacía',
        description: 'Escribe una descripción para tu avatar.',
      });
      return;
    }
    if (!user || !firestore) return;

    setIsGenerating(true);
    try {
      const avatarDataUrl = await getAIAvatar(prompt);
      setGeneratedAvatar(avatarDataUrl);
      setDocumentNonBlocking(doc(firestore, `users/${user.uid}`), { axiomAvatarDataUrl: avatarDataUrl }, { merge: true });
      toast({ title: '¡Avatar generado!', description: 'Tu nuevo avatar se guardó correctamente.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al generar',
        description: error instanceof Error ? error.message : 'Ocurrió un error desconocido.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generador de Avatar con IA
        </CardTitle>
        <CardDescription>Crea un avatar único a partir de una descripción de texto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-square w-full rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <Skeleton className="h-full w-full" />
          ) : currentAvatar ? (
            <Image src={currentAvatar} alt="User Avatar" width={400} height={400} className="object-cover h-full w-full" />
          ) : (
            <ImageIcon className="h-24 w-24 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Ej: Mago cibernético con capucha..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
            {isGenerating ? 'Generando...' : 'Generar avatar'}
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">La generación de imágenes puede tardar unos segundos.</p>
      </CardFooter>
    </Card>
  );
}
