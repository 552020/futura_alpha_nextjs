'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

type InterfaceMode = 'marketing' | 'app';

interface InterfaceContextType {
  mode: InterfaceMode;
  setMode: (mode: InterfaceMode) => void;
  isDeveloper: boolean;
  isAdmin: boolean;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
  // Role utility functions
  isAtLeastModerator: boolean;
  isAtLeastAdmin: boolean;
  isAtLeastDeveloper: boolean;
  isSuperAdmin: boolean;
}

const InterfaceContext = createContext<InterfaceContextType | undefined>(undefined);

// Define app routes that should use app mode
const APP_ROUTES = ['/dashboard', '/feed', '/shared', '/user', '/contacts', '/gallery'];

// Helper function to determine if a path is an app route
function isAppRoute(path: string): boolean {
  // Remove the language prefix if it exists
  const pathWithoutLang = path.replace(/^\/[a-z]{2}/, '');
  return APP_ROUTES.some(route => pathWithoutLang.startsWith(route));
}

export function InterfaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mode, setMode] = useState<InterfaceMode>('marketing');
  const [devMode, setDevMode] = useState(false);

  // Derive role-based permissions from user role
  const userRole = session?.user?.role || 'user';
  const isDeveloper = userRole === 'developer' || userRole === 'admin' || userRole === 'superadmin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isSuperAdmin = userRole === 'superadmin';

  // Role utility functions
  const isAtLeastModerator = ['moderator', 'admin', 'developer', 'superadmin'].includes(userRole);
  const isAtLeastAdmin = ['admin', 'superadmin'].includes(userRole);
  const isAtLeastDeveloper = ['developer', 'superadmin'].includes(userRole);

  useEffect(() => {
    // console.log("InterfaceProvider Debug:", {
    //   pathname,
    //   isAppRoute: isAppRoute(pathname),
    //   newMode: isAppRoute(pathname) ? "app" : "marketing",
    //   userRole: session?.user?.role,
    //   isDeveloper,
    //   isAdmin,
    // });
    setMode(isAppRoute(pathname) ? 'app' : 'marketing');
  }, [pathname, session?.user?.role, isDeveloper, isAdmin]);

  return (
    <InterfaceContext.Provider
      value={{
        mode,
        setMode,
        isDeveloper,
        isAdmin,
        devMode,
        setDevMode,
        isAtLeastModerator,
        isAtLeastAdmin,
        isAtLeastDeveloper,
        isSuperAdmin,
      }}
    >
      {children}
    </InterfaceContext.Provider>
  );
}

export function useInterface() {
  const context = useContext(InterfaceContext);
  if (context === undefined) {
    throw new Error('useInterface must be used within an InterfaceProvider');
  }
  return context;
}
