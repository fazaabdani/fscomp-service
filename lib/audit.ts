/** Best-effort client IP for AuditLog rows. The app sits behind a reverse
 * proxy/tunnel (see DEPLOYMENT.md), so the real client address only shows up
 * in x-forwarded-for — req.headers has no lower-level socket address to
 * fall back to in a serverless/edge-style Next.js route handler. */
export function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
