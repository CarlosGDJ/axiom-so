'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-session-user';
import { useCollection, useDoc, revalidateCollection } from '@/hooks/use-mongo-collection';
import { useRouter } from 'next/navigation';
import { BrainCircuit, Loader2, Sparkles, ChevronRight, ChevronLeft, ShieldCheck, HeartPulse, User, Zap, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { mbtiTypes, enneagramTypes, areaPresets, variablePresets, protocolPresets, hormonePresets } from '@/lib/seed-data';
import { mapMbtiToFacets, mapEnneagramToFacets, mapFacetsToBigFive } from '@/lib/personality-mapper';
import { getAIOnboardingSetup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { GdprGate } from '@/components/app/gdpr-gate';
import type { PlayerProfile, Area } from '@/lib/types';

export default function OnboardingPage() {
  const { uid, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [isProcessing, setIsAiProcessing] = useState(false);
  const totalSteps = 5;

  const [formData, setFormData] = useState({
    age: '30',
    weight: '75',
    height: '180',
    mbti: 'none',
    enneagram: 'none',
    sensitivities: {
        stress: 5,
        dopamine: 5,
        sleep: 5,
        emotional: 5,
        environmental: 5,
        pressure: 5,
    },
    challenges: '',
    goals: [] as string[],
  });

  const { data: existingProfile, isLoading: isProfileLoading, error: profileError } = useDoc<PlayerProfile>(
    'playerProfile', uid ? 'main-profile' : null
  );
  const { data: existingAreas, isLoading: isAreasProbeLoading, error: areasProbeError } = useCollection<Area>(
    uid ? 'areas' : null, { limit: 1 }
  );

  useEffect(() => {
    if (!isUserLoading && !uid) {
      router.replace('/login');
    }

    if (isUserLoading || !uid || isProfileLoading || isAreasProbeLoading || profileError || areasProbeError) return;

    const hasAnyArea = (existingAreas?.length || 0) > 0;
    if (existingProfile || hasAnyArea) {
      router.replace('/dashboard');
    }
  }, [uid, isUserLoading, existingProfile, existingAreas, isProfileLoading, isAreasProbeLoading, profileError, areasProbeError, router]);

  const physioValid = Number(formData.age) > 0 && Number(formData.weight) > 0 && Number(formData.height) > 0
    && formData.age !== '' && formData.weight !== '' && formData.height !== '';

  const handleNext = () => setStep(s => Math.min(totalSteps, s + 1));
  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
        ...prev,
        goals: prev.goals.includes(goal)
            ? prev.goals.filter(g => g !== goal)
            : [...prev.goals, goal]
    }));
  };

  const handleCompleteOnboarding = async () => {
    if (!uid) return;

    setIsAiProcessing(true);
    try {
        const setup = await getAIOnboardingSetup({
            physicalStats: { age: Number(formData.age), weight: Number(formData.weight), height: Number(formData.height) },
            personality: { mbti: formData.mbti, enneagram: formData.enneagram },
            sensitivityScores: formData.sensitivities,
            challenges: formData.challenges,
            goals: formData.goals
        });

        // 1. Personality Mapping
        const mbtiFacets = formData.mbti !== 'none' ? mapMbtiToFacets(formData.mbti) : null;
        const enneagramFacets = formData.enneagram !== 'none' ? mapEnneagramToFacets(formData.enneagram) : null;

        let finalFacets = {
            facet_mind_introverted: 50, facet_energy_intuitive: 50,
            facet_nature_thinking: 50, facet_tactics_judging: 50,
            facet_identity_assertive: 50,
        };

        if (mbtiFacets && enneagramFacets) {
            finalFacets = {
                facet_mind_introverted: Math.round((mbtiFacets.mind.introverted + enneagramFacets.mind.introverted) / 2),
                facet_energy_intuitive: Math.round((mbtiFacets.energy.intuitive + enneagramFacets.energy.intuitive) / 2),
                facet_nature_thinking: Math.round((mbtiFacets.nature.thinking + enneagramFacets.nature.thinking) / 2),
                facet_tactics_judging: Math.round((mbtiFacets.tactics.judging + enneagramFacets.tactics.judging) / 2),
                facet_identity_assertive: Math.round((mbtiFacets.identity.assertive + enneagramFacets.identity.assertive) / 2),
            };
        } else if (mbtiFacets) {
            finalFacets = {
                facet_mind_introverted: mbtiFacets.mind.introverted,
                facet_energy_intuitive: mbtiFacets.energy.intuitive,
                facet_nature_thinking: mbtiFacets.nature.thinking,
                facet_tactics_judging: mbtiFacets.tactics.judging,
                facet_identity_assertive: mbtiFacets.identity.assertive,
            };
        }

        const bigFive = mapFacetsToBigFive({
            mind: { extraverted: 100 - finalFacets.facet_mind_introverted },
            energy: { intuitive: finalFacets.facet_energy_intuitive },
            nature: { feeling: 100 - finalFacets.facet_nature_thinking },
            tactics: { judging: finalFacets.facet_tactics_judging },
            identity: { turbulent: 100 - finalFacets.facet_identity_assertive },
        });

        // 2. Create Player Profile (with specific docId 'main-profile')
        const profileData = {
            age: Number(formData.age),
            weight_kg: Number(formData.weight),
            height_cm: Number(formData.height),
            mbti_type: formData.mbti,
            enneagram_type: formData.enneagram,
            ...finalFacets,
            facet_mind_extraverted: 100 - finalFacets.facet_mind_introverted,
            facet_energy_observant: 100 - finalFacets.facet_energy_intuitive,
            facet_nature_feeling: 100 - finalFacets.facet_nature_thinking,
            facet_tactics_prospecting: 100 - finalFacets.facet_tactics_judging,
            facet_identity_turbulent: 100 - finalFacets.facet_identity_assertive,
            ...bigFive,
            ...setup.sensitivities,
        };

        await fetch('/api/data/playerProfile/main-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData),
        });

        // 3. Bulk insert all other documents via setup endpoint
        const documents: Array<{ collection: string; data: Record<string, unknown> }> = [];

        // Personalized Hormones
        const ageFactor = Math.max(0, Number(formData.age) - 30);
        hormonePresets.forEach(preset => {
            let baseline = preset.baseline;
            if (preset.hormone_id === 'CORTISOL') baseline *= (1 + ageFactor * 0.005);
            if (preset.hormone_id === 'MELATONINA') baseline *= (1 - ageFactor * 0.01);
            const finalBaseline = Math.round(Math.max(10, Math.min(90, baseline)));
            documents.push({ collection: 'hormones', data: { ...preset, baseline: finalBaseline, current_level: finalBaseline } });
        });

        // Areas
        areaPresets.forEach(area => {
            const adjusted = setup.startingAreaStates.find(s => s.area_id === area.area_id);
            documents.push({ collection: 'areas', data: { ...area, estado: adjusted?.status || 'OK' } });
        });

        // Skills y Systems (estructura). Los HÁBITOS ya NO se generan automáticamente:
        // son sugerencias personalizadas que pueden no aplicar al usuario, así que
        // los crea él mismo desde el Habit Tracker. La base para los cálculos del
        // motor (variables, hormonas, áreas, sensibilidades) sí se pre-rellena abajo.
        setup.recommendedSkills.forEach(skillRec => {
            const skillId = `SKILL_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            documents.push({ collection: 'skills', data: {
                habilidad_id: skillId,
                nombre: skillRec.nombre,
                area_id: skillRec.area_id,
                nivel_actual: 1,
                nivel_objetivo: 7,
                estado: 'Activa',
                kpi: skillRec.kpi
            }});

            const systemRec = setup.recommendedSystems.find(s => s.habilidad_name === skillRec.nombre);
            if (systemRec) {
                const systemId = `SYS_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                documents.push({ collection: 'systems', data: {
                    sistema_id: systemId,
                    habilidad_id: skillId,
                    objetivo: systemRec.objetivo,
                    frecuencia: systemRec.frecuencia,
                    estado: 'Activo',
                    protocolo_fallo: 'P_RESET_5'
                }});
            }
        });

        // Essentials
        protocolPresets.forEach(p => documents.push({ collection: 'protocols', data: p as Record<string, unknown> }));
        variablePresets.forEach(v => documents.push({ collection: 'variables', data: v as Record<string, unknown> }));

        await fetch('/api/onboarding/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents }),
        });

        toast({ title: "¡Sistema Calibrado!", description: "Tu bioperfil ha sido sincronizado con éxito." });
        localStorage.setItem(`axiom_onboarding_done_${uid}`, 'true');
        sessionStorage.setItem('axiom-launch-tour', '1');
        // Bust SWR cache so OnboardingGuard sees the new profile immediately on mount
        revalidateCollection('playerProfile');
        revalidateCollection('areas');
        setTimeout(() => router.push('/dashboard'), 1500);
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Falla en la Calibración", description: "Ocurrió un error al procesar tus datos." });
    } finally {
        setIsAiProcessing(false);
    }
  };

  if (isProcessing) {
    return (
        <div className="flex flex-col items-center justify-center min-h-dvh bg-background px-8 py-12 text-center space-y-8 overflow-hidden animate-in fade-in duration-1000">
            <div className="relative shrink-0">
                <BrainCircuit className="h-24 w-24 text-primary animate-pulse" />
                <Sparkles className="absolute -top-4 -right-4 h-10 w-10 text-yellow-400 animate-bounce" />
            </div>
            <div className="space-y-4 w-full max-w-md">
                <h1 className="text-4xl font-extrabold tracking-tighter">Sincronizando Núcleo Axiom</h1>
                <p className="text-muted-foreground text-lg leading-tight">La IA está calculando tus facetas de personalidad y ajustando tus sensibilidades biológicas...</p>
                <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        <span>Configurando Algoritmos</span>
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    </div>
                    <Progress value={85} className="h-1" />
                </div>
            </div>
        </div>
    );
  }

  if (isUserLoading || isProfileLoading || isAreasProbeLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (uid && (existingProfile || (existingAreas?.length || 0) > 0)) return null;

  const SensitivitySlider = ({ label, icon: Icon, value, name, description }: { label: string, icon: any, value: number, name: keyof typeof formData.sensitivities, description: string }) => (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md text-primary"><Icon size={18}/></div>
            <div>
                <Label className="text-sm font-bold">{label}: {value}</Label>
                <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
            </div>
        </div>
        <Slider
            min={1} max={10} step={1} value={[value]}
            onValueChange={v => setFormData({ ...formData, sensitivities: { ...formData.sensitivities, [name]: v[0] } })}
        />
    </div>
  );

  return (
    <GdprGate>
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        <header className="flex flex-col items-center text-center space-y-2">
            <div className="bg-primary/10 p-3 rounded-full mb-2"><BrainCircuit className="h-10 w-10 text-primary" /></div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Calibración Axiom</h1>
            <p className="text-muted-foreground max-w-sm">Configura tu bioperfil para una optimización precisa.</p>
            <div className="flex gap-1 mt-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", step >= i ? "bg-primary" : "bg-muted-foreground/20")} />
                ))}
            </div>
        </header>

        <Card className="shadow-xl border-2">
            <CardContent className="p-8 space-y-8">
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2"><HeartPulse className="text-primary" /><h2 className="text-xl font-bold">Datos Fisiológicos</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2"><Label>Edad</Label><Input type="number" min={1} placeholder="30" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" min={1} placeholder="75" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} /></div>
                            <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" min={1} placeholder="180" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2"><User className="text-primary" /><h2 className="text-xl font-bold">Arquetipos</h2></div>
                        <p className="text-sm text-muted-foreground">Esto mapeará tus 10 facetas de personalidad automáticamente.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label>MBTI</Label><Select value={formData.mbti} onValueChange={v => setFormData({...formData, mbti: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No lo sé</SelectItem>{mbtiTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Eneagrama</Label><Select value={formData.enneagram} onValueChange={v => setFormData({...formData, enneagram: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">No lo sé</SelectItem>{enneagramTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2"><Zap className="text-primary" /><h2 className="text-xl font-bold">Test de Sensibilidad</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SensitivitySlider label="Resiliencia al Estrés" icon={Activity} value={formData.sensitivities.stress} name="stress" description="1: Indiferente, 10: Bloqueo total ante plazos." />
                            <ControlDopaSlider value={formData.sensitivities.dopamine} onChange={v => setFormData({...formData, sensitivities: {...formData.sensitivities, dopamine: v}})} />
                            <SensitivitySlider label="Sensibilidad al Sueño" icon={HeartPulse} value={formData.sensitivities.sleep} name="sleep" description="1: Funciono con 4h, 10: Humor arruinado si duermo <7h." />
                            <SensitivitySlider label="Orden del Entorno" icon={BrainCircuit} value={formData.sensitivities.environmental} name="environmental" description="1: El caos no me afecta, 10: El desorden me irrita." />
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2"><Sparkles className="text-primary" /><h2 className="text-xl font-bold">Desafíos</h2></div>
                        <div className="space-y-2">
                            <Label>¿Qué es lo que más te está frenando ahora mismo?</Label>
                            <Textarea placeholder="Sé sincero. La IA calibrará tus puntos débiles..." className="min-h-[150px] resize-none" value={formData.challenges} onChange={e => setFormData({...formData, challenges: e.target.value})} />
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2"><ShieldCheck className="text-primary" /><h2 className="text-xl font-bold">Objetivos</h2></div>
                        <div className="grid grid-cols-2 gap-3">
                            {['Salud Física', 'Salud Mental', 'Finanzas', 'Carrera', 'Disciplina', 'Relaciones'].map(goal => (
                                <Button key={goal} variant={formData.goals.includes(goal) ? "default" : "outline"} className="h-12 justify-start font-medium" onClick={() => toggleGoal(goal)}>
                                    {formData.goals.includes(goal) && <ShieldCheck className="mr-2 h-4 w-4" />}{goal}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={handlePrev} disabled={step === 1}><ChevronLeft className="mr-2 h-4 w-4" /> Atrás</Button>
                    {step < totalSteps ? (
                        <Button onClick={handleNext} disabled={step === 1 && !physioValid}>Siguiente <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    ) : (
                        <div className="flex flex-col items-end gap-1">
                          <Button onClick={handleCompleteOnboarding} disabled={formData.goals.length === 0}>Finalizar y Calibrar <Sparkles className="ml-2 h-4 w-4" /></Button>
                          {formData.goals.length === 0 && <p className="text-xs text-muted-foreground">Selecciona al menos un objetivo</p>}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
    </GdprGate>
  );
}

function ControlDopaSlider({ value, onChange }: { value: number, onChange: (v: number) => void }) {
    return (
        <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md text-primary"><Zap size={18}/></div>
                <div>
                    <Label className="text-sm font-bold">Control de Dopamina: {value}</Label>
                    <p className="text-[10px] text-muted-foreground leading-tight">1: Sin móvil hasta las 10am, 10: Miro redes al abrir los ojos.</p>
                </div>
            </div>
            <Slider min={1} max={10} step={1} value={[value]} onValueChange={v => onChange(v[0])} />
        </div>
    );
}
