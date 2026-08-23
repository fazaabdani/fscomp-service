// Pure money-logic helpers, kept separate from service-desk.tsx (a large
// client component) so they're importable from tests without pulling in
// React/DOM. Typed against a minimal structural subset of Ticket rather than
// the full type, so any object with these fields works.
type MoneyTicket = {
  costConfirmed?: boolean;
  finalCost?: number | null;
  downPayment: number;
  estimate: number;
};

// finalCost defaults to 0 until costConfirmed is set, so `finalCost || estimate`
// wrongly falls back to the estimate for a genuinely free (Rp0) confirmed job.
export const finalPrice = (t: MoneyTicket) =>
  t.costConfirmed ? (t.finalCost ?? 0) : t.finalCost || t.estimate;

// Gate for printing a "Nota Lunas" — requires the final cost to have been
// explicitly confirmed (not just defaulting to an unconfirmed estimate) and
// the remaining balance to actually be zero, so the app can never hand out
// a paid-in-full receipt for a ticket that hasn't really been settled.
// No Math.max clamp: if downPayment overshoots finalPrice (e.g. finalCost
// confirmed at Rp0 after a DP was already taken), that's an overpayment
// needing a manual correction, not something to silently wave through as
// "fully paid" — clamping a negative balance to 0 was exactly the bug that
// let a Rp0-cost, DP-already-collected ticket print a paid-in-full nota.
export const isFullyPaid = (t: MoneyTicket) =>
  t.costConfirmed && finalPrice(t) - t.downPayment === 0;
