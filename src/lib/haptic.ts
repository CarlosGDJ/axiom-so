type HapticPattern = 'tap' | 'success' | 'warning' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap:     10,
  success: [15, 10, 30],
  warning: [20, 15, 20],
  error:   [50, 20, 50],
};

export function haptic(pattern: HapticPattern = 'tap') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[pattern]);
}
