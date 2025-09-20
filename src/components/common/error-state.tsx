import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  fullScreen?: boolean;
  showIcon?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  className,
  fullScreen = false,
  showIcon = true,
}: ErrorStateProps) {
  const errorContent = (
    <div className={cn('text-center', className)}>
      {showIcon && <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />}
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      {message && <p className="text-muted-foreground mb-6">{message}</p>}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {retryText}
        </Button>
      )}
    </div>
  );

  if (fullScreen) {
    return <div className="flex items-center justify-center min-h-screen">{errorContent}</div>;
  }

  return errorContent;
}
