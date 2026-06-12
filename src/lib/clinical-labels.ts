// Etiquetas en español para los marcadores clínicos del modelo v2. Evita mostrar
// los IDs crudos en inglés (HIGH_THREAT_LOAD, LOW_RECOVERY_CAPACITY…) en una UI
// en español. Usar `clinicalMarkerLabel(id)` en todas las superficies.

const CLINICAL_MARKER_LABELS_ES: Record<string, string> = {
  HIGH_THREAT_LOAD: 'Carga de amenaza alta',
  LOW_RECOVERY_CAPACITY: 'Capacidad de recuperación baja',
  LOW_EXECUTIVE_CONTROL: 'Control ejecutivo bajo',
  LOW_REWARD_DRIVE: 'Motivación / recompensa baja',
  SLEEP_DISRUPTION: 'Alteración del sueño',
  LOW_CONFIDENCE_DATA: 'Datos insuficientes',
};

export function clinicalMarkerLabel(id: string): string {
  return CLINICAL_MARKER_LABELS_ES[id] ?? id.replace(/_/g, ' ').toLowerCase();
}
