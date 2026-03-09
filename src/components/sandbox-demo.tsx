"use client";

import { useState, useEffect } from "react";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Plus, Terminal } from "lucide-react";

export function SandboxDemo() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "demo_messages"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsub();
    }, [user]);

    const handleLogin = async () => {
        setLoading(true);
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const addMessage = async () => {
        if (!user) return;
        try {
            await addDoc(collection(db, "demo_messages"), {
                text: `Mensaje de prueba generado a las ${new Date().toLocaleTimeString()}`,
                userId: user.uid,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-2xl border-white/10 dark:bg-black/40 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <Terminal className="text-primary" />
                    Firebase Sandbox
                </CardTitle>
                <CardDescription>
                    Entorno local conectado a emuladores. ¡Listo para desarrollar!
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!user ? (
                    <div className="text-center py-6">
                        <p className="text-muted-foreground mb-4">No estás autenticado. Comienza creando una sesión anónima en el emulador local.</p>
                        <Button onClick={handleLogin} size="lg" className="w-full sm:w-auto">
                            Iniciar Sesión Anónima
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <p className="text-sm font-medium">Sesión Activa (Emulador Local)</p>
                                <p className="text-xs text-muted-foreground break-all">UID: {user.uid}</p>
                            </div>
                            <Button onClick={addMessage} variant="default" size="sm" className="gap-2">
                                <Plus size={16} /> Crear Documento
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Documentos en Firestore (demo_messages)</h3>
                            <div className="bg-card/50 border rounded-xl overflow-hidden min-h-[150px] max-h-[300px] overflow-y-auto">
                                {messages.length === 0 ? (
                                    <div className="flex items-center justify-center p-8 text-muted-foreground text-sm italic">
                                        La colección está vacía. Haz clic en "Crear Documento".
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-border/50">
                                        {messages.map(msg => (
                                            <li key={msg.id} className="p-4 hover:bg-muted/50 transition-colors">
                                                <p className="text-sm">{msg.text}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 font-mono">ID: {msg.id}</p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground justify-between border-t p-4 bg-muted/20">
                <span>Framework: Next.js 15 (App Router)</span>
                <span>UI: Shadcn + Tailwind CSS</span>
            </CardFooter>
        </Card>
    );
}
