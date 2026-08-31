/**
 * ICP Environment Configuration
 * Simplified mainnet/local detection for ICP network operations
 */

export const HOST =
  process.env.NEXT_PUBLIC_IC_HOST ??
  (process.env.NEXT_PUBLIC_DFX_NETWORK === 'ic'
    ? 'https://icp-api.io'
    : 'http://127.0.0.1:4943');

export const IS_MAINNET = process.env.NEXT_PUBLIC_DFX_NETWORK === 'ic';
export const IS_LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(
  HOST
);
