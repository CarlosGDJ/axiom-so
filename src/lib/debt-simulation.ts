import type { Debt } from '@/lib/types';

export interface DebtSimulationResult {
  monthsToFreedom: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: string[];
}

/**
 * Simulates debt payoff under a given strategy using the debt-roll method:
 * when a debt is paid off, its freed monthly payment rolls into the next debt.
 *
 * @param debts Active debts sorted in the strategy's attack order (first = attack first)
 * @param extraMonthlyPayment Additional payment beyond minimums (default 0)
 * @param maxMonths Safety cap (default 600 = 50 years)
 */
export function simulateDebtPayoff(
  debts: Debt[],
  extraMonthlyPayment = 0,
  maxMonths = 600,
): DebtSimulationResult {
  if (debts.length === 0) {
    return { monthsToFreedom: 0, totalInterestPaid: 0, totalPaid: 0, payoffOrder: [] };
  }

  // Clone balances
  const balances = debts.map(d => Math.max(0, d.saldo_pendiente ?? d.saldo_actual));
  const monthlyRates = debts.map(d => d.interes_tae / 100 / 12);
  const minimums = debts.map(d => Math.max(d.cuota_mensual, 1));

  let totalInterest = 0;
  let month = 0;
  let freedPayment = extraMonthlyPayment;
  const payoffOrder: string[] = [];

  // Track which debts are still active
  const active = debts.map(() => true);

  while (month < maxMonths && active.some(Boolean)) {
    month++;

    // First, accrue interest on all active debts
    for (let i = 0; i < debts.length; i++) {
      if (!active[i]) continue;
      const interest = balances[i] * monthlyRates[i];
      balances[i] += interest;
      totalInterest += interest;
    }

    // Find the current "attack" debt (first still active)
    const attackIdx = active.findIndex(Boolean);

    // Apply payments
    for (let i = 0; i < debts.length; i++) {
      if (!active[i]) continue;
      const payment = i === attackIdx
        ? minimums[i] + freedPayment
        : minimums[i];
      balances[i] = Math.max(0, balances[i] - payment);
      if (balances[i] === 0) {
        active[i] = false;
        payoffOrder.push(debts[i].nombre);
        // Roll the freed minimum payment into the next attack
        freedPayment += minimums[i];
      }
    }
  }

  const totalMinimums = minimums.reduce((a, b) => a + b, 0);
  const totalPaid = (totalMinimums + extraMonthlyPayment) * month;

  return {
    monthsToFreedom: month,
    totalInterestPaid: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    payoffOrder,
  };
}

export function sortSnowball(debts: Debt[]): Debt[] {
  return [...debts].sort(
    (a, b) => (a.saldo_pendiente ?? a.saldo_actual) - (b.saldo_pendiente ?? b.saldo_actual),
  );
}

export function sortAvalanche(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => b.interes_tae - a.interes_tae);
}
