'use client';

import { FileText, ImageIcon, Video, Share2, Trash2, File, Pencil, Music, Folder } from 'lucide-react';
import { Memory } from '@/types/memory';
import { MemoryStatus } from './memory-status';
import { MemoryStorageBadge } from '@/components/common/memory-storage-badge';
import { BaseCard } from '@/components/common/base-card';
import Image from 'next/image';
import { shortenTitle } from '@/lib/utils';

interface MemoryCardProps {
  memory: Memory & {
    status: 'private' | 'shared' | 'public';
    sharedWithCount?: number;
    sharedBy?: string;
  };
  onClick: (memory: Memory) => void;
  onDelete: (memoryId: string) => void;
  onShare: (memoryId: string) => void;
  onEdit: (memoryId: string) => void;
  viewMode?: 'grid' | 'list';
}

export function MemoryCard({ memory, onClick, onDelete, onShare, onEdit, viewMode = 'grid' }: MemoryCardProps) {
  if (viewMode === 'list') {
    // List view - keep existing implementation for now
    return (
      <div
        className="cursor-pointer transition-all hover:shadow-md p-4 border rounded-lg"
        onClick={() => onClick(memory)}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {memory.type === 'image' ? (
              <ImageIcon className="h-8 w-8" />
            ) : memory.type === 'video' ? (
              <Video className="h-8 w-8" />
            ) : memory.type === 'note' ? (
              <FileText className="h-8 w-8" />
            ) : memory.type === 'document' ? (
              <File className="h-8 w-8" />
            ) : memory.type === 'audio' ? (
              <Music className="h-8 w-8" />
            ) : memory.type === 'folder' ? (
              <Folder className="h-8 w-8" />
            ) : (
              <FileText className="h-8 w-8" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={memory.title}>
              {shortenTitle(memory.title)}
            </h3>
            {memory.description && <p className="text-sm text-muted-foreground truncate">{memory.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <MemoryStatus status={memory.status} sharedWithCount={memory.sharedWithCount} sharedBy={memory.sharedBy} />
            <button
              className="p-2 hover:bg-accent rounded"
              onClick={e => {
                e.stopPropagation();
                onEdit(memory.id);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              className="p-2 hover:bg-accent rounded"
              onClick={e => {
                e.stopPropagation();
                onShare(memory.id);
              }}
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              className="p-2 hover:bg-accent rounded"
              onClick={e => {
                e.stopPropagation();
                onDelete(memory.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view - use BaseCard
  return (
    <BaseCard
      item={memory}
      onClick={onClick}
      onEdit={onEdit ? () => onEdit(memory.id) : undefined}
      onShare={onShare ? () => onShare(memory.id) : undefined}
      onDelete={onDelete ? () => onDelete(memory.id) : undefined}
      renderPreview={memory => {
        if (memory.type === 'image' && memory.thumbnail) {
          return (
            <Image
              src={memory.thumbnail}
              alt={memory.title || 'Memory image'}
              fill={true}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          );
        }

        const IconComponent =
          memory.type === 'image'
            ? ImageIcon
            : memory.type === 'video'
              ? Video
              : memory.type === 'note'
                ? FileText
                : memory.type === 'document'
                  ? File
                  : memory.type === 'audio'
                    ? Music
                    : memory.type === 'folder'
                      ? Folder
                      : FileText;

        const label =
          memory.type === 'folder'
            ? `${memory.itemCount || 0} items`
            : memory.type === 'video'
              ? 'Video'
              : memory.type === 'audio'
                ? 'Audio'
                : memory.type === 'document'
                  ? 'Document'
                  : memory.type === 'note'
                    ? 'Note'
                    : 'File';

        return (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <IconComponent className="h-16 w-16 mb-2" />
            <span className="text-sm">{label}</span>
          </div>
        );
      }}
      renderTitle={memory => shortenTitle(memory.title)}
      renderDescription={memory => memory.description}
      renderStorageBadge={memory =>
        memory.type !== 'folder' ? <MemoryStorageBadge memoryId={memory.id} memoryType={memory.type} size="xs" /> : null
      }
      renderLeftStatus={memory => (
        <>
          {/* Document type icon */}
          <div className="flex-shrink-0">
            {memory.type === 'image' ? (
              <ImageIcon className="h-4 w-4" />
            ) : memory.type === 'video' ? (
              <Video className="h-4 w-4" />
            ) : memory.type === 'note' ? (
              <FileText className="h-4 w-4" />
            ) : memory.type === 'document' ? (
              <File className="h-4 w-4" />
            ) : memory.type === 'audio' ? (
              <Music className="h-4 w-4" />
            ) : memory.type === 'folder' ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>

          {/* Visibility status */}
          <MemoryStatus status={memory.status} sharedWithCount={memory.sharedWithCount} sharedBy={memory.sharedBy} />
        </>
      )}
    />
  );
}
