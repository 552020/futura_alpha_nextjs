/**
 * Admin Configuration
 *
 * This file contains admin-related configuration and utilities.
 * Admin emails are managed through environment variables for security.
 */

/**
 * Get list of admin emails from environment variables
 * No fallback: futura.now is no longer ours, so a hard-coded address there
 * would hand admin to whoever registers the domain. Unset means role-only.
 */
export function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.map((email) => email.trim()).filter(Boolean);
}

/**
 * Check if a user is an admin based on their email or role
 */
export function isAdmin(email?: string, role?: string): boolean {
  if (!email) return false;

  const adminEmails = getAdminEmails();

  const isAdminResult = adminEmails.includes(email) || role === 'admin';

  return isAdminResult;
}

/**
 * Get admin configuration for display purposes
 */
export function getAdminConfig() {
  return {
    adminEmails: getAdminEmails(),
    isConfigured: process.env.ADMIN_EMAILS !== undefined,
  };
}
