"use client";

import { initOrbiter } from "@junobuild/analytics";
import { useEffect } from "react";

export function OrbiterProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initOrbiter({
      options: {
        userAgentParser: true,
        performance: true
      }
    });
  }, []);

  return <>{children}</>;
}
