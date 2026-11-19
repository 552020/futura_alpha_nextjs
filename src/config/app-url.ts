/**
 * Public production URL of the app.
 * futura.now was given up in 2026; the Vercel production alias is canonical.
 * Override per environment with NEXT_PUBLIC_APP_URL.
 */
export const PRODUCTION_URL =
  'https://futura-alpha-552020s-projects.vercel.app';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL;
