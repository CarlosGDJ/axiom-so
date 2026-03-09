'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Lock } from 'lucide-react';

interface PremiumAIBlockerProps {
    title: string;
    description: string;
}

export default function PremiumAIBlocker({ title, description }: PremiumAIBlockerProps) {
  return (
    <Card className="h-full flex flex-col items-center justify-center text-center">
      <CardHeader>
        <div className="mx-auto bg-muted rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button>Desbloquear Premium</Button>
      </CardContent>
    </Card>
  );
}
