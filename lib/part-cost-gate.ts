// The parts cost (modal sparepart) must be answered before a job is announced as ready for
// pickup, otherwise the monthly profit report quietly counts the job as zero cost.
// "Answered" means a number was stored: Rp0 is a valid answer (cleaning, reinstall, no parts),
// null/undefined means nobody has said anything yet. Old data kept real numbers or 0.
const LEAVING = ["Bisa Diambil", "Sudah Diambil"];

/** True when moving `from` -> `to` must first have the parts cost answered. */
export function partCostRequired(
  from: string,
  to: string | undefined,
  partCost: number | null | undefined,
): boolean {
  if (!to || !LEAVING.includes(to)) return false;
  // Already past the "ready" step: the question was either asked at that step or predates this rule.
  if (LEAVING.includes(from)) return false;
  return partCost === null || partCost === undefined;
}
