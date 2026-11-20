import { auth } from '@/auth';
import { isAdmin } from '@/config/admin';

// The desk uses the app's own login with roles (desk-login standard, kind 3):
// admins only, no second password.
export async function deskAccess(): Promise<
  'admin' | 'forbidden' | 'anonymous'
> {
  const session = await auth();
  const user = session?.user as
    | { email?: string | null; role?: string }
    | undefined;
  if (!user) return 'anonymous';
  return isAdmin(user.email ?? undefined, user.role) ? 'admin' : 'forbidden';
}
