import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { title?: string; name?: string } }) => {
      console.log('🔧 [FOLDER MUTATION] Updating folder', { id, updates });
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('❌ [FOLDER MUTATION] Update failed', { status: res.status, text });
        throw new Error('Failed to update folder');
      }
      console.log('✅ [FOLDER MUTATION] Update OK');
      return res.json();
    },
    onSettled: () => {
      console.log('🔁 [FOLDER MUTATION] Invalidate dashboard');
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
    },
  });
}
