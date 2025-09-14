/**
 * Project configuration utilities
 * Handles different project variants (FUTURA, KOTTIMOTTI)
 */

export type ProjectVariant = "FUTURA" | "KOTTIMOTTI";

/**
 * Get the current project variant from environment variables
 */
export function getProjectVariant(): ProjectVariant {
  const show = process.env.NEXT_PUBLIC_SHOW;
  if (show === "KOTTIMOTTI") {
    console.log("SHOW var set to KOTTIMOTTI");
    return "KOTTIMOTTI";
  }
  console.log("SHOW var set to FUTURA");
  console.log("SHOW =", process.env.SHOW);
  console.log("NEXT_PUBLIC_SHOW =", process.env.NEXT_PUBLIC_SHOW);
  return "FUTURA"; // Default to FUTURA
}

/**
 * Check if the current project is KOTTIMOTTI
 */
export function isKOTTIMOTTI(): boolean {
  return getProjectVariant() === "KOTTIMOTTI";
}

/**
 * Check if the current project is FUTURA
 */
export function isFutura(): boolean {
  return getProjectVariant() === "FUTURA";
}
