/** Public GA4 measurement ID for qasem-portal.com. */
export const GA_ID = "G-QBDGD8NFFW";

/**
 * Analytics runs on the production deployment only. NODE_ENV is "production"
 * on Vercel previews and under `next start`, so it cannot tell them apart;
 * VERCEL_ENV is set by Vercel alone ("production" | "preview" | "development").
 */
export function isProductionDeploy(vercelEnv: string | undefined): boolean {
  return vercelEnv === "production";
}
