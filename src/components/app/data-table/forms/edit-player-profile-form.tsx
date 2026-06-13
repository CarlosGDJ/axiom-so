
'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { PlayerProfile } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  mapMbtiToFacets,
  mapEnneagramToFacets,
  mapFacetsToBigFive,
} from '@/lib/personality-mapper';
import {
  mbtiTypes,
  enneagramTypes,
  hormonePresets,
} from '@/lib/seed-data';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useUser } from '@/hooks/use-session-user';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, addDocumentNonBlocking } from '@/lib/api-writes';

const formSchema = z.object({
  age: z.coerce.number().int().min(0, 'La edad debe ser un número positivo.'),
  weight_kg: z.coerce.number().min(0, 'El peso debe ser un número positivo.'),
  height_cm: z.coerce.number().int().min(0, 'La altura debe ser un número positivo.'),

  // Facets
  facet_mind_introverted: z.coerce.number().min(0).max(100),
  facet_mind_extraverted: z.coerce.number().min(0).max(100),
  facet_energy_intuitive: z.coerce.number().min(0).max(100),
  facet_energy_observant: z.coerce.number().min(0).max(100),
  facet_nature_thinking: z.coerce.number().min(0).max(100),
  facet_nature_feeling: z.coerce.number().min(0).max(100),
  facet_tactics_judging: z.coerce.number().min(0).max(100),
  facet_tactics_prospecting: z.coerce.number().min(0).max(100),
  facet_identity_assertive: z.coerce.number().min(0).max(100),
  facet_identity_turbulent: z.coerce.number().min(0).max(100),

  // Big Five (derived)
  personality_openness: z.coerce.number().min(0).max(100),
  personality_conscientiousness: z.coerce.number().min(0).max(100),
  personality_extraversion: z.coerce.number().min(0).max(100),
  personality_agreeableness: z.coerce.number().min(0).max(100),
  personality_neuroticism: z.coerce.number().min(0).max(100),

  // Sensitivities
  sensitivity_stress: z.coerce.number().min(0.5).max(2.0),
  sensitivity_dopamine: z.coerce.number().min(0.5).max(2.0),
  sensitivity_sleep: z.coerce.number().min(0.5).max(2.0),
  sensitivity_emotional: z.coerce.number().min(0.5).max(2.0),
  sensitivity_environmental: z.coerce.number().min(0.5).max(2.0),
  sensitivity_pressure: z.coerce.number().min(0.5).max(2.0),

  mbti_type: z.string().optional(),
  enneagram_type: z.string().optional(),
});

type EditPlayerProfileFormValues = z.infer<typeof formSchema>;

interface EditPlayerProfileFormProps {
  playerProfile: PlayerProfile | null;
}

const defaultProfileValues: Omit<PlayerProfile, 'id'> = {
  age: 30,
  weight_kg: 75,
  height_cm: 180,
  facet_mind_introverted: 50,
  facet_mind_extraverted: 50,
  facet_energy_intuitive: 50,
  facet_energy_observant: 50,
  facet_nature_thinking: 50,
  facet_nature_feeling: 50,
  facet_tactics_judging: 50,
  facet_tactics_prospecting: 50,
  facet_identity_assertive: 50,
  facet_identity_turbulent: 50,
  personality_openness: 50,
  personality_conscientiousness: 50,
  personality_extraversion: 50,
  personality_agreeableness: 50,
  personality_neuroticism: 50,
  sensitivity_stress: 1.0,
  sensitivity_dopamine: 1.0,
  sensitivity_sleep: 1.0,
  sensitivity_emotional: 1.0,
  sensitivity_environmental: 1.0,
  sensitivity_pressure: 1.0,
  mbti_type: 'none',
  enneagram_type: 'none',
};

// Dichotomy Slider Component
const DichotomySlider = ({
  control,
  setValue,
  name,
  label,
  leftLabel,
  rightLabel,
  leftFacet,
  rightFacet,
}: {
  control: any;
  setValue: Function;
  name: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftFacet: keyof EditPlayerProfileFormValues;
  rightFacet: keyof EditPlayerProfileFormValues;
}) => {
  return (
    <FormField
      control={control}
      name={leftFacet}
      render={({ field }) => {
        const sliderValue = isNaN(field.value) ? 50 : field.value;
        const handleValueChange = (value: number) => {
          setValue(leftFacet, value, { shouldDirty: true });
          setValue(rightFacet, 100 - value, { shouldDirty: true });
        };

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="relative pt-2">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[sliderValue]}
                  onValueChange={(v) => handleValueChange(v[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>
                    {leftLabel} ({sliderValue}%)
                  </span>
                  <span>
                    ({100 - sliderValue}%) {rightLabel}
                  </span>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default function EditPlayerProfileForm({
  playerProfile,
}: EditPlayerProfileFormProps) {
  const { toast } = useToast();  const { user, uid } = useUser();
  const router = useRouter();
  const isEditMode = !!playerProfile;
  const [showRadarChart, setShowRadarChart] = useState(false);
  const [activeSensitivityPreset, setActiveSensitivityPreset] = useState<
    string | null
  >(null);
  
  const form = useForm<EditPlayerProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
        return playerProfile 
            ? { ...defaultProfileValues, ...playerProfile }
            : defaultProfileValues;
    }, [playerProfile])
  });

  // Re-sync form when playerProfile data arrives or is removed
  useEffect(() => {
    const values = playerProfile 
        ? { ...defaultProfileValues, ...playerProfile }
        : defaultProfileValues;
    form.reset(values);
  }, [playerProfile, form]);
  
  type SensitivityPreset = {
    sensitivity_stress: number;
    sensitivity_dopamine: number;
    sensitivity_sleep: number;
    sensitivity_emotional: number;
    sensitivity_environmental: number;
    sensitivity_pressure: number;
  };

  const sensitivityPresets: Record<string, SensitivityPreset> = {
    estable: {
      sensitivity_stress: 1.0,
      sensitivity_dopamine: 1.0,
      sensitivity_sleep: 1.0,
      sensitivity_emotional: 1.0,
      sensitivity_environmental: 1.0,
      sensitivity_pressure: 1.0,
    },
    sensible: {
      sensitivity_stress: 1.4,
      sensitivity_dopamine: 1.5,
      sensitivity_sleep: 1.3,
      sensitivity_emotional: 1.6,
      sensitivity_environmental: 1.2,
      sensitivity_pressure: 1.1,
    },
    resiliente: {
      sensitivity_stress: 0.7,
      sensitivity_dopamine: 0.8,
      sensitivity_sleep: 0.9,
      sensitivity_emotional: 0.6,
      sensitivity_environmental: 0.8,
      sensitivity_pressure: 0.7,
    },
  };

  const applySensitivityPreset = (
    presetName: keyof typeof sensitivityPresets
  ) => {
    const preset = sensitivityPresets[presetName];
    Object.keys(preset).forEach((key) => {
      form.setValue(
        key as keyof SensitivityPreset,
        preset[key as keyof SensitivityPreset],
        { shouldDirty: true }
      );
    });
  };

  const mbtiType = useWatch({ control: form.control, name: 'mbti_type' });
  const enneagramType = useWatch({
    control: form.control,
    name: 'enneagram_type',
  });

  const watchedSensitivities = useWatch({
    control: form.control,
    name: [
      'sensitivity_stress',
      'sensitivity_dopamine',
      'sensitivity_sleep',
      'sensitivity_emotional',
      'sensitivity_environmental',
      'sensitivity_pressure',
    ],
  });
  
  const handleResetProfile = () => {
    if (!uid) return;
        deleteDocumentNonBlocking('playerProfile', 'main-profile');
    toast({
      title: 'Perfil Reseteado',
      description: 'Tu perfil ha sido borrado. Redirigiendo a la calibración...',
    });
    router.push('/onboarding');
  };

  // Effect to update personality facets based on archetype selection.
  useEffect(() => {
    if (!form.formState.isDirty) return;

    const mbtiSelected = mbtiType && mbtiType !== 'none';
    const enneagramSelected = enneagramType && enneagramType !== 'none';

    if (!mbtiSelected && !enneagramSelected) return;

    const mbtiFacets = mbtiSelected ? mapMbtiToFacets(mbtiType!) : null;
    const enneagramFacets = enneagramSelected
      ? mapEnneagramToFacets(enneagramType!)
      : null;

    let finalFacets = {
      facet_mind_introverted: 50,
      facet_energy_intuitive: 50,
      facet_nature_thinking: 50,
      facet_tactics_judging: 50,
      facet_identity_assertive: 50,
    };

    if (mbtiFacets && enneagramFacets) {
      finalFacets = {
        facet_mind_introverted: Math.round(
          (mbtiFacets.mind.introverted + enneagramFacets.mind.introverted) / 2
        ),
        facet_energy_intuitive: Math.round(
          (mbtiFacets.energy.intuitive + enneagramFacets.energy.intuitive) / 2
        ),
        facet_nature_thinking: Math.round(
          (mbtiFacets.nature.thinking + enneagramFacets.nature.thinking) / 2
        ),
        facet_tactics_judging: Math.round(
          (mbtiFacets.tactics.judging + enneagramFacets.tactics.judging) / 2
        ),
        facet_identity_assertive: Math.round(
          (mbtiFacets.identity.assertive + enneagramFacets.identity.assertive) /
            2
        ),
      };
    } else if (mbtiFacets) {
      finalFacets = {
        facet_mind_introverted: mbtiFacets.mind.introverted,
        facet_energy_intuitive: mbtiFacets.energy.intuitive,
        facet_nature_thinking: mbtiFacets.nature.thinking,
        facet_tactics_judging: mbtiFacets.tactics.judging,
        facet_identity_assertive: mbtiFacets.identity.assertive,
      };
    } else if (enneagramFacets) {
      finalFacets = {
        facet_mind_introverted: enneagramFacets.mind.introverted,
        facet_energy_intuitive: enneagramFacets.energy.intuitive,
        facet_nature_thinking: enneagramFacets.nature.thinking,
        facet_tactics_judging: enneagramFacets.tactics.judging,
        facet_identity_assertive: enneagramFacets.identity.assertive,
      };
    }

    form.setValue( 'facet_mind_introverted', finalFacets.facet_mind_introverted, { shouldDirty: true } );
    form.setValue( 'facet_mind_extraverted', 100 - finalFacets.facet_mind_introverted, { shouldDirty: true } );
    form.setValue( 'facet_energy_intuitive', finalFacets.facet_energy_intuitive, { shouldDirty: true } );
    form.setValue( 'facet_energy_observant', 100 - finalFacets.facet_energy_intuitive, { shouldDirty: true } );
    form.setValue( 'facet_nature_thinking', finalFacets.facet_nature_thinking, { shouldDirty: true } );
    form.setValue( 'facet_nature_feeling', 100 - finalFacets.facet_nature_thinking, { shouldDirty: true } );
    form.setValue( 'facet_tactics_judging', finalFacets.facet_tactics_judging, { shouldDirty: true } );
    form.setValue( 'facet_tactics_prospecting', 100 - finalFacets.facet_tactics_judging, { shouldDirty: true } );
    form.setValue( 'facet_identity_assertive', finalFacets.facet_identity_assertive, { shouldDirty: true } );
    form.setValue( 'facet_identity_turbulent', 100 - finalFacets.facet_identity_assertive, { shouldDirty: true } );
  }, [mbtiType, enneagramType, form]);

  useEffect(() => {
    const currentValues: Partial<SensitivityPreset> = {
      sensitivity_stress: watchedSensitivities[0],
      sensitivity_dopamine: watchedSensitivities[1],
      sensitivity_sleep: watchedSensitivities[2],
      sensitivity_emotional: watchedSensitivities[3],
      sensitivity_environmental: watchedSensitivities[4],
      sensitivity_pressure: watchedSensitivities[5],
    };

    let matchedPreset = null;
    for (const presetName in sensitivityPresets) {
      const presetValues = sensitivityPresets[presetName];
      const isMatch = Object.keys(presetValues).every(
        (key) =>
          presetValues[key as keyof SensitivityPreset] ===
          currentValues[key as keyof SensitivityPreset]
      );
      if (isMatch) {
        matchedPreset = presetName;
        break;
      }
    }
    setActiveSensitivityPreset(matchedPreset);
  }, [watchedSensitivities, sensitivityPresets]);

  const watchedFacetValues = useWatch({
    control: form.control,
    name: [
      'facet_mind_introverted',
      'facet_energy_intuitive',
      'facet_nature_thinking',
      'facet_tactics_judging',
      'facet_identity_assertive',
    ],
  });

  const bigFiveValues = mapFacetsToBigFive({
    mind: { extraverted: 100 - (watchedFacetValues[0] || 50) },
    energy: { intuitive: watchedFacetValues[1] || 50 },
    nature: { feeling: 100 - (watchedFacetValues[2] || 50) },
    tactics: { judging: watchedFacetValues[3] || 50 },
    identity: { turbulent: 100 - (watchedFacetValues[4] || 50) },
  });

  useEffect(() => {
    form.setValue('personality_openness', bigFiveValues.personality_openness);
    form.setValue('personality_conscientiousness', bigFiveValues.personality_conscientiousness);
    form.setValue('personality_extraversion', bigFiveValues.personality_extraversion);
    form.setValue('personality_agreeableness', bigFiveValues.personality_agreeableness);
    form.setValue('personality_neuroticism', bigFiveValues.personality_neuroticism);
  }, [
    bigFiveValues.personality_openness,
    bigFiveValues.personality_conscientiousness,
    bigFiveValues.personality_extraversion,
    bigFiveValues.personality_agreeableness,
    bigFiveValues.personality_neuroticism,
    form
  ]);

  const bigFiveData = [
    { subject: 'Apertura', value: bigFiveValues.personality_openness, fullMark: 100 },
    { subject: 'Tesón', value: bigFiveValues.personality_conscientiousness, fullMark: 100 },
    { subject: 'Extraversión', value: bigFiveValues.personality_extraversion, fullMark: 100 },
    { subject: 'Amabilidad', value: bigFiveValues.personality_agreeableness, fullMark: 100 },
    { subject: 'Neuroticismo', value: bigFiveValues.personality_neuroticism, fullMark: 100 },
  ];

  async function onSubmit(data: EditPlayerProfileFormValues) {
    if (!uid) return;

    const dataToSave = {
      ...data,
      ...bigFiveValues, // ensure the latest calculated Big Five are saved
    };

    setDocumentNonBlocking('playerProfile', 'main-profile', dataToSave, { merge: true });

    if (!isEditMode) {
      const ageFactor = Math.max(0, data.age - 30);

      hormonePresets.forEach((preset) => {
        let adjustedBaseline = preset.baseline;

        switch (preset.hormone_id) {
          case 'CORTISOL':
            adjustedBaseline *= 1 + ageFactor * 0.005;
            break;
          case 'MELATONINA':
            adjustedBaseline *= 1 - ageFactor * 0.01;
            break;
          case 'ENDORFINAS':
            adjustedBaseline *= 1 - ageFactor * 0.002;
            break;
        }

        const finalBaseline = Math.round(
          Math.max(10, Math.min(90, adjustedBaseline))
        );

        const personalizedHormone = {
          ...preset,
          baseline: finalBaseline,
          current_level: finalBaseline,
        };
        addDocumentNonBlocking('hormones', personalizedHormone);
      });
    }

    toast({
      title: isEditMode ? 'Perfil Actualizado' : 'Perfil Creado',
      description: 'Tus parámetros base han sido guardados.',
    });
    form.reset(dataToSave);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[75vh] w-full pr-4">
          <div className="space-y-8 p-1">
            <div>
              <h3 className="text-lg font-medium">Parámetros Corporales</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height_cm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (cm)</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium">Arquetipos de Personalidad</h3>
              <p className="text-sm text-muted-foreground">
                Selecciona un arquetipo para autocompletar los valores de
                personalidad.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="mbti_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MBTI</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona MBTI..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {mbtiTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enneagram_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eneagrama</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona Eneagrama..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {enneagramTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    Parámetros de Personalidad
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ajusta tus rasgos o visualiza el resumen "Big Five".
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <FormLabel
                    htmlFor="personality-view"
                    className={cn(!showRadarChart && 'text-primary')}
                  >
                    Facetas
                  </FormLabel>
                  <Switch
                    id="personality-view"
                    checked={showRadarChart}
                    onCheckedChange={setShowRadarChart}
                  />
                  <FormLabel
                    htmlFor="personality-view"
                    className={cn(showRadarChart && 'text-primary')}
                  >
                    Big Five
                  </FormLabel>
                </div>
              </div>

              <div className="mt-6">
                {!showRadarChart ? (
                  <div className="space-y-6">
                    <DichotomySlider
                      control={form.control}
                      setValue={form.setValue}
                      name="mind"
                      label="Mente"
                      leftLabel="Introvertido"
                      rightLabel="Extravertido"
                      leftFacet="facet_mind_introverted"
                      rightFacet="facet_mind_extraverted"
                    />
                    <DichotomySlider
                      control={form.control}
                      setValue={form.setValue}
                      name="energy"
                      label="Energía"
                      leftLabel="Intuitivo"
                      rightLabel="Observador"
                      leftFacet="facet_energy_intuitive"
                      rightFacet="facet_energy_observant"
                    />
                    <DichotomySlider
                      control={form.control}
                      setValue={form.setValue}
                      name="nature"
                      label="Naturaleza"
                      leftLabel="Pensador"
                      rightLabel="Emocional"
                      leftFacet="facet_nature_thinking"
                      rightFacet="facet_nature_feeling"
                    />
                    <DichotomySlider
                      control={form.control}
                      setValue={form.setValue}
                      name="tactics"
                      label="Tácticas"
                      leftLabel="Juzgador"
                      rightLabel="Prospectivo"
                      leftFacet="facet_tactics_judging"
                      rightFacet="facet_tactics_prospecting"
                    />
                    <DichotomySlider
                      control={form.control}
                      setValue={form.setValue}
                      name="identity"
                      label="Identidad"
                      leftLabel="Asertivo"
                      rightLabel="Turbulento"
                      leftFacet="facet_identity_assertive"
                      rightFacet="facet_identity_turbulent"
                    />
                  </div>
                ) : (
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        data={bigFiveData}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Player"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.6}
                          animationDuration={300}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium">Perfil de Sensibilidad</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Define tu "cableado" interno. Estos valores actúan como
                multiplicadores del impacto de los eventos.
              </p>

              <div className="mb-6 space-x-2">
                <Button
                  type="button"
                  variant={
                    activeSensitivityPreset === 'estable' ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => applySensitivityPreset('estable')}
                >
                  Estable
                </Button>
                <Button
                  type="button"
                  variant={
                    activeSensitivityPreset === 'sensible'
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => applySensitivityPreset('sensible')}
                >
                  Sensible
                </Button>
                <Button
                  type="button"
                  variant={
                    activeSensitivityPreset === 'resiliente'
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() => applySensitivityPreset('resiliente')}
                >
                  Resiliente
                </Button>
              </div>

              <div className="space-y-6 mt-4">
                <FormField
                  control={form.control}
                  name="sensitivity_stress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad al Estrés: {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Ajusta cuánto impactan el estrés y la presión en tu
                        rendimiento. No es cuánto estrés tienes, sino cuánto te
                        afecta.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitivity_dopamine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad a la Dopamina:{' '}
                        {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Controla el impacto de la dopamina barata (redes,
                        azúcar) en tu enfoque y disciplina.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitivity_sleep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad al Sueño: {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        Cómo de rápido se degrada tu rendimiento cuando duermes
                        poco.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitivity_emotional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad Emocional / Reactividad:{' '}
                        {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        El impacto que tienen en ti los conflictos, críticas o
                        eventos emocionales.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitivity_environmental"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad al Entorno: {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        La influencia del desorden y el caos de tu entorno en tu
                        enfoque y disciplina.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitivity_pressure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sensibilidad a la Presión / Urgencia:{' '}
                        {(field.value || 0).toFixed(1)}
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          value={[field.value || 0]}
                          onValueChange={(v) => field.onChange(v[0])}
                        />
                      </FormControl>
                      <FormDescription>
                        El efecto de los deadlines, la multitarea y la
                        sobrecarga en tu energía mental.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="submit"
            disabled={!form.formState.isDirty && isEditMode}
          >
            {isEditMode ? 'Guardar Cambios' : 'Crear Perfil'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
