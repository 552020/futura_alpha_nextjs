'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function TemporaryUserCard() {
  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="text-yellow-800 dark:text-yellow-200">Temporary Account</CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">
          You are using a temporary account. Complete your signup to keep your account permanently.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="default" className="w-full">
          Complete Signup
        </Button>
      </CardContent>
    </Card>
  );
}
