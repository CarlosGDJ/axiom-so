
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Sparkles, Bot, AlertCircle } from 'lucide-react';
import { getAIInsights } from '@/lib/actions';
import { Skeleton } from '../ui/skeleton';
import type { UserData } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import PremiumAIBlocker from './premium-ai-blocker';

interface AIInsightsProps {
  userData: UserData | null;
  initialInsight: string | null;
  isLoadingInitialInsight: boolean;
  isPremium: boolean;
}

export default function AIInsights({ userData, initialInsight, isLoadingInitialInsight, isPremium }: AIInsightsProps) {
  const [question, setQuestion] = useState('');
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isPremium) {
    return (
        <PremiumAIBlocker 
            title="Pregúntale a tu Asesor de IA"
            description="Obtén información personalizada de tus datos, o haz una pregunta específica. Requiere Premium."
        />
    )
  }

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !userData) return;

    setLoading(true);
    setInsight('');
    
    const result = await getAIInsights({
        question,
        overallState: userData.overallState,
        kpis: JSON.stringify(userData.kpis),
        events: JSON.stringify(userData.events),
        transactions: JSON.stringify(userData.transactions),
        interactions: JSON.stringify(userData.interactions),
    });
    
    setInsight(result);
    setLoading(false);
    setQuestion('');
  };

  const displayInsight = insight || initialInsight;
  const isLoading = loading || isLoadingInitialInsight;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Asesor de IA Axiom
        </CardTitle>
        <CardDescription>
          Análisis algorítmico de tus tendencias y biomarcadores personales.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
         {(isLoading || displayInsight) && (
          <div className="mb-6 flex-grow">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Bot /> Respuesta de Axiom</h4>
            <ScrollArea className="h-[150px] w-full border rounded-lg bg-muted/20">
                <div className="p-4 space-y-4 text-sm prose prose-sm dark:prose-invert max-w-none">
                {isLoading ? (
                    <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {displayInsight && <p className="italic leading-relaxed">{displayInsight}</p>}
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-background/50 rounded border border-border/50 text-[10px] text-muted-foreground mt-4">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <p>Esta respuesta es generada por IA. No es un consejo médico ni diagnóstico clínico. Verifica siempre con un profesional de la salud.</p>
                        </div>
                    </>
                )}
                </div>
            </ScrollArea>
          </div>
        )}

        <form onSubmit={handleQuestionSubmit} className="space-y-4 mt-auto">
          <Textarea
            placeholder="¿Cómo puedo mejorar mi nivel de dopamina hoy?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading || isLoadingInitialInsight || !userData}
            className="resize-none"
          />
          <Button type="submit" disabled={loading || isLoadingInitialInsight || !question.trim() || !userData} className="w-full">
            {loading ? 'Analizando biomarcadores...' : 'Consultar Asesor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
