/** Fire-and-forget push of a payment to the Owner Command Center dashboard.
 * Never throws, never blocks the caller — a dashboard outage must not affect
 * ticket payment flow. */
export function pushPaymentToDashboard(payment: {
  id: string;
  ticketId: string;
  amount: number;
  method: string;
  createdAt: Date;
}) {
  const url = process.env.DASHBOARD_INGEST_URL;
  const token = process.env.OWNER_INGEST_TOKEN;
  if (!url || !token) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": token },
    body: JSON.stringify({
      type: "transaction",
      payload: {
        id: payment.id,
        date: payment.createdAt.toISOString(),
        amount: payment.amount,
        label: `Servis ${payment.ticketId} - ${payment.method}`,
      },
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    // Intentionally swallowed — see function doc.
  });
}
