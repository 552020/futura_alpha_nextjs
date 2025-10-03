import { Session } from 'next-auth';

export interface AuthStatus {
  isSignedIn: boolean;
  loginProvider: string | null;
  isSignedInWithGoogle: boolean;
  isSignedInWithII: boolean;
  isSignedInWithEmail: boolean;
  providerDisplayName: string;
  // Internet Identity specific
  activeIcPrincipal?: string;
  hasActiveIcPrincipal: boolean;
}

/**
 * Get authentication status from session
 * @param session NextAuth session
 * @returns AuthStatus object with authentication details
 */
export function getAuthStatus(session: Session | null): AuthStatus {
  const isSignedIn = !!session?.user;
  const loginProvider = session?.user?.loginProvider || null;

  // Get active ICP principal from session (if available)
  const activeIcPrincipal = (session?.user as { icpPrincipal?: string })?.icpPrincipal;
  const hasActiveIcPrincipal = !!activeIcPrincipal;

  return {
    isSignedIn,
    loginProvider,
    isSignedInWithGoogle: loginProvider === 'google',
    isSignedInWithII: loginProvider === 'internet-identity',
    isSignedInWithEmail: loginProvider === 'email',
    providerDisplayName: getProviderDisplayName(loginProvider),
    // Internet Identity specific
    activeIcPrincipal,
    hasActiveIcPrincipal,
  };
}

/**
 * Get display name for login provider
 * @param provider Login provider string
 * @returns Human-readable provider name
 */
function getProviderDisplayName(provider: string | null): string {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'internet-identity':
      return 'Internet Identity';
    case 'email':
      return 'Email';
    default:
      return 'Not signed in';
  }
}
