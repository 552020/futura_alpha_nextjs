'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { createCapsule } from '@/services/capsule';
import type { PersonRef } from '@/types/capsule';
import { fatLogger } from '@/lib/logger';

export interface CreateCapsuleFormData {
  subjectType: 'self' | 'opaque';
  subjectValue?: string;
  description?: string;
}

interface CreateCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapsuleCreated?: () => void;
  hasSelfCapsule?: boolean;
}

export function CreateCapsuleModal({
  isOpen,
  onClose,
  onCapsuleCreated,
  hasSelfCapsule = false,
}: CreateCapsuleModalProps) {
  const [formData, setFormData] = useState<CreateCapsuleFormData>({
    subjectType: hasSelfCapsule ? 'opaque' : 'self',
    subjectValue: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getActor, clearActor } = useAuthenticatedActor();
  const { toast } = useToast();

  const handleSubjectTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subjectType: value as CreateCapsuleFormData['subjectType'],
      subjectValue: '', // Clear subject value when type changes
    }));
    setError(null);
  };

  const handleSubjectValueChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      subjectValue: value,
    }));
    setError(null);
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value,
    }));
  };

  const validateForm = (): string | null => {
    if (formData.subjectType === 'opaque' && !formData.subjectValue?.trim()) {
      return 'Subject value is required for opaque type';
    }
    if (
      formData.subjectType === 'opaque' &&
      formData.subjectValue &&
      formData.subjectValue.length > 100
    ) {
      return 'Subject value must be 100 characters or less';
    }
    if (
      formData.subjectType === 'opaque' &&
      formData.subjectValue &&
      formData.subjectValue.length < 1
    ) {
      return 'Subject value must be at least 1 character';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let subject: PersonRef | null = null;

      switch (formData.subjectType) {
        case 'self':
          subject = null; // Will create self-capsule
          break;
        case 'opaque':
          subject = { Opaque: formData.subjectValue || '' };
          break;
      }

      await createCapsule(subject, getActor, clearActor);

      toast({
        title: 'Success',
        description: 'Capsule created successfully!',
      });

      // Reset form
      setFormData({
        subjectType: hasSelfCapsule ? 'opaque' : 'self',
        subjectValue: '',
        description: '',
      });

      onCapsuleCreated?.();
      onClose();
    } catch (error) {
      fatLogger.error('Failed to create capsule', 'fe', { error });
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create capsule';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        subjectType: hasSelfCapsule ? 'opaque' : 'self',
        subjectValue: '',
        description: '',
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Capsule</DialogTitle>
          <DialogDescription>
            Create a capsule for yourself or someone else. Choose the subject
            type and provide the necessary information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subject Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Subject Type</Label>
            <RadioGroup
              value={formData.subjectType}
              onValueChange={handleSubjectTypeChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="self"
                  id="self"
                  disabled={hasSelfCapsule}
                />
                <Label
                  htmlFor="self"
                  className={`text-sm ${hasSelfCapsule ? 'text-muted-foreground' : ''}`}
                >
                  Self (Your own capsule) {hasSelfCapsule && '(Already exists)'}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="opaque" id="opaque" />
                <Label htmlFor="opaque" className="text-sm">
                  Other (Custom identifier)
                </Label>
              </div>
            </RadioGroup>
            {hasSelfCapsule && (
              <p className="text-sm text-muted-foreground">
                You already have a self-capsule. You can only create capsules
                for other subjects.
              </p>
            )}
          </div>

          {/* Subject Value Input */}
          {formData.subjectType !== 'self' && (
            <div className="space-y-2">
              <Label htmlFor="subjectValue" className="text-sm font-medium">
                Subject Value
              </Label>
              <Input
                id="subjectValue"
                value={formData.subjectValue}
                onChange={(e) => handleSubjectValueChange(e.target.value)}
                placeholder="Enter custom identifier (1-100 characters)"
                disabled={isLoading}
              />
              {formData.subjectType === 'opaque' && (
                <p className="text-xs text-muted-foreground">
                  Enter a custom identifier for this capsule (1-100 characters)
                </p>
              )}
            </div>
          )}

          {/* Optional Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="What is this capsule for? (e.g., 'My grandmother's memories')"
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Capsule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
