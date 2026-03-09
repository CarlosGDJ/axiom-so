'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Lightbulb, Check } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import PremiumAIBlocker from './premium-ai-blocker';

interface ProtocolRecommendationsProps {
  recommendations: string[];
  isLoading: boolean;
  isPremium: boolean;
}

export default function ProtocolRecommendations({ recommendations, isLoading, isPremium }: ProtocolRecommendationsProps) {
  
  if (!isPremium) {
    return (
        <PremiumAIBlocker 
            title="Recomendaciones de Protocolo por IA"
            description="Recibe pasos accionables para mejorar tu bienestar basados en tus datos. Requiere Premium."
        />
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          Recomendaciones de Protocolo por IA
        </CardTitle>
        <CardDescription>Pasos accionables para mejorar tu bienestar basados en tus datos.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-4/5" />
            </div>
            <div className="flex items-start gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-3/5" />
            </div>
            <div className="flex items-start gap-3 p-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ) : recommendations?.length > 0 ? (
          <ul className="space-y-3">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-background">
                <Check className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay recomendaciones disponibles en este momento. ¡Sigue registrando tus datos!</p>
        )}
      </CardContent>
    </Card>
  );
}
