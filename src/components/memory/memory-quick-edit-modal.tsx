'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type ResourceType = 'memory' | 'folder';

export interface QuickEditPayload {
  title?: string;
  description?: string;
}

interface MemoryQuickEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: ResourceType;
  resourceId: string;
  initialTitle?: string;
  initialDescription?: string;
  onSave: (params: { resourceType: ResourceType; resourceId: string; data: QuickEditPayload }) => Promise<void> | void;
  isSaving?: boolean;
}

export function MemoryQuickEditModal({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  initialTitle,
  initialDescription,
  onSave,
  isSaving = false,
}: MemoryQuickEditModalProps) {
  const [title, setTitle] = useState<string>(initialTitle ?? '');
  const [description, setDescription] = useState<string>(initialDescription ?? '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reset fields when opening for a different resource or when toggling open
  useEffect(() => {
    if (open) {
      setTitle(initialTitle ?? '');
      setDescription(initialDescription ?? '');
    }
  }, [open, initialTitle, initialDescription, resourceId]);

  const isChanged = useMemo(() => {
    return (title ?? '') !== (initialTitle ?? '') || (description ?? '') !== (initialDescription ?? '');
  }, [title, description, initialTitle, initialDescription]);

  const canSubmit = useMemo(() => {
    // Allow empty description; title optional too – submit only if something changed
    return isChanged && !submitting && !isSaving;
  }, [isChanged, submitting, isSaving]);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSave({
        resourceType,
        resourceId,
        data: { title: title?.trim() || undefined, description: description?.trim() || undefined },
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Edit {resourceType === 'folder' ? 'Folder' : 'Memory'}</DialogTitle>
          <DialogDescription>
            Update the title and description. Advanced fields are available in the full edit view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a short description"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting || isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting || isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MemoryQuickEditModal;
