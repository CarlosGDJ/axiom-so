'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { ArrowRight, Zap } from 'lucide-react';
import type { ImpactMatrix, Variable, Hormone } from '@/lib/types';

export interface Connection {
    id: string;
    varName: string;
    hormoneName: string;
    effectSize: number;
}

interface TopConnectionsListProps {
    connections: Connection[];
}

export default function TopConnectionsList({ connections }: TopConnectionsListProps) {
    if (!connections || connections.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap /> Top 10 Conexiones</CardTitle>
                    <CardDescription>Las conexiones más fuertes de tu sistema.</CardDescription>
                </CardHeader>
                <CardContent className="h-[450px] flex items-center justify-center">
                    <p className="text-muted-foreground">No hay conexiones que mostrar.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap /> Top 10 Conexiones</CardTitle>
                <CardDescription>Las conexiones más fuertes (positivas o negativas) en tu Matriz de Impacto.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {connections.map(conn => (
                        <li key={conn.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{conn.varName}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{conn.hormoneName}</span>
                            </div>
                            <span className={`font-bold text-lg ${conn.effectSize > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {conn.effectSize > 0 ? '+' : ''}{conn.effectSize.toFixed(0)}
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
