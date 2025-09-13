import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  text = "Loading...",
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const spinner = (
    <div className={cn("text-center", className)}>
      <Loader2 className={cn("animate-spin text-primary mx-auto mb-4", sizeClasses[size])} />
      {text && <p className="text-muted-foreground text-sm">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="flex items-center justify-center min-h-screen">{spinner}</div>;
  }

  return spinner;
}
