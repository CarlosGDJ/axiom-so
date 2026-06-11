'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { useTour } from './tour-context';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLTIP_W = 320;
const TOOLTIP_H_EST = 210;
const GAP = 16;
const PAD = 8;
const RADIUS = 10;

interface ViewRect { top: number; left: number; width: number; height: number }

function buildHolePath(r: ViewRect): string {
  const { top: y, left: x, width: w, height: h } = r;
  const rx = x - PAD, ry = y - PAD, rw = w + PAD * 2, rh = h + PAD * 2;
  return (
    `M ${rx + RADIUS} ${ry} ` +
    `H ${rx + rw - RADIUS} Q ${rx + rw} ${ry} ${rx + rw} ${ry + RADIUS} ` +
    `V ${ry + rh - RADIUS} Q ${rx + rw} ${ry + rh} ${rx + rw - RADIUS} ${ry + rh} ` +
    `H ${rx + RADIUS} Q ${rx} ${ry + rh} ${rx} ${ry + rh - RADIUS} ` +
    `V ${ry + RADIUS} Q ${rx} ${ry} ${rx + RADIUS} ${ry} Z`
  );
}

function calcTooltipPos(rect: ViewRect | null, position: string): { top: number; left: number } {
  if (!rect || rect.width === 0) {
    return {
      top: (window.innerHeight - TOOLTIP_H_EST) / 2,
      left: (window.innerWidth - TOOLTIP_W) / 2,
    };
  }
  let top = 0, left = 0;
  switch (position) {
    case 'bottom': top = rect.top + rect.height + GAP;              left = rect.left + rect.width / 2 - TOOLTIP_W / 2; break;
    case 'top':    top = rect.top - TOOLTIP_H_EST - GAP;            left = rect.left + rect.width / 2 - TOOLTIP_W / 2; break;
    case 'right':  top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2; left = rect.left + rect.width + GAP;           break;
    case 'left':   top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2; left = rect.left - TOOLTIP_W - GAP;          break;
    default:       top = rect.top + rect.height + GAP;              left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  }
  left = Math.max(12, Math.min(left, window.innerWidth  - TOOLTIP_W   - 12));
  top  = Math.max(12, Math.min(top,  window.innerHeight - TOOLTIP_H_EST - 12));
  return { top, left };
}

export function TourOverlay() {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour } = useTour();
  const [rect, setRect] = useState<ViewRect | null>(null);
  const step = steps[currentStep];

  useLayoutEffect(() => {
    if (!isActive || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      const t = setTimeout(() => {
        if (currentStep < steps.length - 1) nextStep(); else endTour();
      }, 400);
      return () => clearTimeout(t);
    }

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      // Check if the element is inside the sidebar Sheet (collapsed on mobile)
      const sidebarPanel = document.querySelector('[data-sidebar="sidebar"]');
      const isInSidebar = sidebarPanel ? sidebarPanel.contains(el) : false;

      if (isInSidebar) {
        // Open the sidebar, then re-measure
        const trigger = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement | null;
        if (trigger) {
          trigger.click();
          const t = setTimeout(() => {
            const r2 = el.getBoundingClientRect();
            if (r2.width > 0) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => {
                const r3 = el.getBoundingClientRect();
                setRect({ top: r3.top, left: r3.left, width: r3.width, height: r3.height });
              }, 300);
            } else {
              if (currentStep < steps.length - 1) nextStep(); else endTour();
            }
          }, 700);
          return () => clearTimeout(t);
        }
      }

      // Not in sidebar or no trigger — skip step
      const t = setTimeout(() => {
        if (currentStep < steps.length - 1) nextStep(); else endTour();
      }, 400);
      return () => clearTimeout(t);
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => {
      const r2 = el.getBoundingClientRect();
      setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
    }, 350);
    return () => clearTimeout(t);
  }, [isActive, currentStep, step, nextStep, endTour, steps.length]);

  useEffect(() => {
    if (!isActive || !step) return;
    const update = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isActive, step]);

  if (!isActive || !step) return null;

  const holePath = rect && rect.width > 0 ? buildHolePath(rect) : '';
  const tooltipPos = calcTooltipPos(rect, step.position);
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <>
      {/* SVG spotlight overlay */}
      <svg
        className="fixed inset-0 z-[998]"
        style={{ width: '100vw', height: '100vh', pointerEvents: 'all', cursor: 'default' }}
        onClick={endTour}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {holePath && <path d={holePath} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
        {holePath && (
          <path d={holePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeOpacity="0.7" />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className="fixed z-[999] bg-card border border-border rounded-xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_W }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress + close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentStep ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <button
            onClick={endTour}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
            aria-label="Cerrar guía"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="font-bold text-base mb-1.5">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{step.content}</p>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevStep} disabled={isFirst} className="h-8 px-3 gap-1">
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </Button>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {currentStep + 1} / {steps.length}
          </span>
          {isLast ? (
            <Button size="sm" onClick={endTour} className="h-8 px-4">
              ¡Listo!
            </Button>
          ) : (
            <Button size="sm" onClick={nextStep} className="h-8 px-3 gap-1">
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
