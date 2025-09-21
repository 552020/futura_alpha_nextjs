import Image from 'next/image';
import { TempFile } from '@/contexts/onboarding-context';

interface ImagePreviewProps {
  file: TempFile;
  className?: string;
}

export function ImagePreview({ file, className = '' }: ImagePreviewProps) {
  if (!file.url) return null;

  return (
    <div className={`relative aspect-square overflow-hidden rounded-lg ${className}`}>
      <Image
        src={file.url}
        alt="Memory preview"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
