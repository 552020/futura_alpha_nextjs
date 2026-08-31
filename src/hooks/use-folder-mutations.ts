import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fatLogger } from '@/lib/logger';

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { title?: string; name?: string };
    }) => {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const text = await res.text();
        fatLogger.error('[FOLDER MUTATION] Update failed', 'fe', {
          status: res.status,
          text,
        });
        throw new Error('Failed to update folder');
      }
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
    },
  });
}
