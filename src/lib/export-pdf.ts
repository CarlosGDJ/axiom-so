import type { UserData } from '@/lib/types';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function stateLabel(s: string) {
  if (s === 'CRITICO') return 'CRÍTICO';
  if (s === 'RIESGO') return 'RIESGO';
  return 'OK';
}

/**
 * Generates a weekly summary PDF using jsPDF (loaded dynamically to avoid SSR issues).
 * Call only from client-side code.
 */
export async function exportWeeklySummaryPDF(userData: UserData): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  const now = new Date();
  const weekAgo = subDays(now, 7);

  // ── Color palette ──
  const COL = {
    primary: [67, 97, 238] as [number, number, number],
    accent: [124, 77, 200] as [number, number, number],
    ok: [34, 197, 94] as [number, number, number],
    risk: [249, 115, 22] as [number, number, number],
    critical: [239, 68, 68] as [number, number, number],
    muted: [148, 163, 184] as [number, number, number],
    bg: [15, 23, 42] as [number, number, number],
    card: [30, 41, 59] as [number, number, number],
    text: [226, 232, 240] as [number, number, number],
    textDim: [100, 116, 139] as [number, number, number],
  };

  function stateColor(s: string): [number, number, number] {
    if (s === 'CRITICO') return COL.critical;
    if (s === 'RIESGO') return COL.risk;
    return COL.ok;
  }

  // ── Helpers ──
  function setFont(style: 'normal' | 'bold', size: number, color: [number, number, number] = COL.text) {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  }

  function fillRect(x: number, yy: number, w: number, h: number, color: [number, number, number], r = 0) {
    doc.setFillColor(...color);
    if (r > 0) {
      doc.roundedRect(x, yy, w, h, r, r, 'F');
    } else {
      doc.rect(x, yy, w, h, 'F');
    }
  }

  function checkPage(needed = 20) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      fillRect(0, 0, pageW, pageH, COL.bg);
      y = margin;
    }
  }

  function sectionTitle(title: string) {
    checkPage(14);
    setFont('bold', 9, COL.primary);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...COL.primary);
    doc.setLineWidth(0.4);
    doc.line(margin + doc.getTextWidth(title.toUpperCase()) + 2, y - 0.5, margin + contentW, y - 0.5);
    y += 7;
  }

  function kpiCard(x: number, yy: number, w: number, h: number, label: string, value: string, color: [number, number, number] = COL.primary) {
    fillRect(x, yy, w, h, COL.card, 3);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.6);
    doc.rect(x, yy, w, h, 'S');
    setFont('normal', 7, COL.textDim);
    doc.text(label.toUpperCase(), x + 4, yy + 6);
    setFont('bold', 11, color);
    doc.text(value, x + 4, yy + 14);
  }

  // ── Background ──
  fillRect(0, 0, pageW, pageH, COL.bg);

  // ── Header ──
  fillRect(0, 0, pageW, 36, COL.card);
  doc.setDrawColor(...COL.primary);
  doc.setLineWidth(0.8);
  doc.line(0, 36, pageW, 36);

  setFont('bold', 20, COL.primary);
  doc.text('AXIOM', margin, 18);
  setFont('normal', 9, COL.textDim);
  doc.text('Sistema Operativo Personal', margin, 25);

  setFont('normal', 8, COL.textDim);
  const dateStr = `Resumen Semanal · ${format(weekAgo, 'dd MMM', { locale: es })} – ${format(now, 'dd MMM yyyy', { locale: es })}`;
  doc.text(dateStr, pageW - margin - doc.getTextWidth(dateStr), 18);

  const stateStr = stateLabel(userData.overallState);
  const stateFill = stateColor(userData.overallState);
  const stateW = doc.getTextWidth(stateStr) + 8;
  fillRect(pageW - margin - stateW, 22, stateW, 9, stateFill, 2);
  setFont('bold', 8, [255, 255, 255]);
  doc.text(stateStr, pageW - margin - stateW + 4, 28.5);

  y = 46;

  // ── Estado Global ──
  sectionTitle('Estado del Sistema');

  const rpg = userData.rpg_stats;
  const kpiData = [
    { label: 'Dopamina', value: `${Math.round(rpg.dopamina)}/100` },
    { label: 'Serotonina', value: `${Math.round(rpg.serotonina)}/100` },
    { label: 'Cortisol', value: `${Math.round(rpg.cortisol)}/100`, invert: true },
    { label: 'Foco', value: `${Math.round(rpg.foco)}/100` },
    { label: 'Energía', value: `${Math.round(rpg.energia)}/100` },
    { label: 'Sueño', value: `${Math.round(rpg.sueno)}/100` },
  ];

  const cardW = (contentW - 8) / 3;
  const cardH = 20;
  for (let i = 0; i < kpiData.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = margin + col * (cardW + 4);
    const cy = y + row * (cardH + 4);
    const item = kpiData[i];
    const val = parseFloat(item.value);
    const color = (item as any).invert
      ? (val > 60 ? COL.critical : val > 30 ? COL.risk : COL.ok)
      : (val >= 60 ? COL.ok : val >= 40 ? COL.risk : COL.critical);
    kpiCard(cx, cy, cardW, cardH, item.label, item.value, color);
  }
  y += Math.ceil(kpiData.length / 3) * (cardH + 4) + 6;

  // ── Score del jugador ──
  checkPage(18);
  fillRect(margin, y, contentW, 14, COL.card, 3);
  setFont('normal', 8, COL.textDim);
  doc.text('PUNTUACIÓN GLOBAL', margin + 4, y + 6);
  setFont('bold', 14, COL.primary);
  doc.text(`${Math.round(rpg.player_score)} pts`, margin + 4, y + 13);
  y += 20;

  // ── Áreas de Vida ──
  sectionTitle('Áreas de Vida');
  const areas = userData.kpis.scoresByArea;
  if (areas.length > 0) {
    const barH = 5;
    const labelW = 50;
    const barMaxW = contentW - labelW - 25;

    for (const area of areas) {
      checkPage(10);
      const color: [number, number, number] = area.score >= 75 ? COL.ok : area.score >= 50 ? COL.risk : COL.critical;
      setFont('normal', 7, COL.text);
      doc.text(area.area.substring(0, 22), margin, y + barH - 1);
      fillRect(margin + labelW, y, barMaxW, barH, [40, 55, 75], 1);
      fillRect(margin + labelW, y, (area.score / 100) * barMaxW, barH, color, 1);
      setFont('bold', 7, color);
      doc.text(`${area.score}`, margin + labelW + barMaxW + 3, y + barH - 1);
      y += barH + 3;
    }
    y += 4;
  }

  // ── Finanzas del periodo ──
  sectionTitle('Finanzas del Periodo');
  const fin = userData.kpis.monthlyFinancials;
  const net = fin.totalIncome - fin.totalExpenses;
  const finCards = [
    { label: 'Ingresos', value: formatCurrency(fin.totalIncome), color: COL.ok },
    { label: 'Gastos', value: formatCurrency(fin.totalExpenses), color: COL.risk },
    { label: 'Neto', value: formatCurrency(net), color: net >= 0 ? COL.ok : COL.critical },
  ];
  checkPage(24);
  const finCardW = (contentW - 8) / 3;
  finCards.forEach((fc, i) => {
    kpiCard(margin + i * (finCardW + 4), y, finCardW, 20, fc.label, fc.value, fc.color);
  });
  y += 26;

  // ── Eventos recientes ──
  const recentEvents = userData.events
    .filter(e => {
      const d = parseISO(e.fecha);
      return d >= weekAgo && d <= now;
    })
    .slice(0, 8);

  if (recentEvents.length > 0) {
    sectionTitle('Eventos de la Semana');
    const vars = new Map(userData.variables.map(v => [v.var_id, v.var_nombre]));
    for (const ev of recentEvents) {
      checkPage(8);
      fillRect(margin, y, contentW, 7, COL.card, 2);
      setFont('normal', 7, COL.textDim);
      doc.text(format(parseISO(ev.fecha), 'dd/MM', { locale: es }), margin + 2, y + 5);
      setFont('normal', 7, COL.text);
      const vname = vars.get(ev.var_id) || ev.var_id;
      doc.text(vname.substring(0, 35), margin + 18, y + 5);
      setFont('bold', 7, COL.primary);
      doc.text(`Int. ${ev.intensidad}/5`, margin + contentW - 18, y + 5);
      y += 9;
    }
    y += 4;
  }

  // ── Footer ──
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    setFont('normal', 7, COL.textDim);
    doc.text(
      `Axiom · Generado ${format(now, 'dd/MM/yyyy HH:mm')} · Página ${p}/${totalPages}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' },
    );
    doc.text('Este documento no constituye diagnóstico médico ni asesoramiento profesional.', pageW / 2, pageH - 4, { align: 'center' });
  }

  // ── Save ──
  const filename = `axiom-resumen-${format(now, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
