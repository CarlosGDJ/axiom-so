'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Moon, Dumbbell, Zap, DollarSign, Users } from 'lucide-react';

const FIRST_STEPS = [
  { label: 'Sueño de anoche', href: '/dashboard/sleep', icon: Moon, color: 'text-blue-500', description: 'Dato más impactante del sistema' },
  { label: 'Actividad física', href: '/dashboard/physical', icon: Dumbbell, color: 'text-green-500', description: '+20 energía y cortisol −15' },
  { label: 'Estado de ánimo', href: '/dashboard/dopamine', icon: Zap, color: 'text-violet-500', description: 'Calibra tu dopamina basal' },
  { label: 'Gasto o ingreso', href: '/dashboard/finances', icon: DollarSign, color: 'text-orange-500', description: 'Empieza a rastrear finanzas' },
  { label: 'Interacción social', href: '/dashboard/relations', icon: Users, color: 'text-pink-500', description: 'Registra energía social' },
];

export default function FirstEventCard() {
  return (
    <Card className="border-primary/20 bg-primary/3">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-bold">Sistema calibrado. Ahora registra tu primer evento.</p>
            <p className="text-xs text-muted-foreground">
              El motor necesita datos para calcularte. Empieza por cualquiera de estas áreas —
              el sueño tiene el mayor peso inicial.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FIRST_STEPS.map(step => {
            const Icon = step.icon;
            return (
              <Link key={step.href} href={step.href}>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 transition-colors text-left">
                  <Icon className={`h-4 w-4 shrink-0 ${step.color}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{step.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
                  </div>
                </button>
              </Link>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Link href="/dashboard/chat">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Sparkles className="h-3 w-3" />
              Preguntar a la IA qué registrar primero
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
