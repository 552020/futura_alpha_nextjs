'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface RequireAuthProps {
  title?: string;
  message?: string;
  buttonText?: string;
}

export default function RequireAuth({
  title = 'Please Sign In',
  message = 'To access this page, you need to be signed in to your account.',
  buttonText = 'Go to Sign In',
}: RequireAuthProps) {
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || 'en';

  return (
    <div className="fixed inset-0 z-40 min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center space-y-4 max-w-md px-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={() => router.push(`/${lang}/signin`)}>{buttonText}</Button>
      </div>
    </div>
  );
}
