'use client';

import Image from 'next/image';
import { ComponentProps } from 'react';

interface OptimizedImageProps extends ComponentProps<typeof Image> {
  src: string;
}

export function OptimizedImage({ src, ...props }: OptimizedImageProps) {
  // Check if the image is from S3 - if so, use regular img tag to bypass Next.js optimization
  const isS3Image = src.includes('s3.eu-central-1.amazonaws.com') || src.includes('s3.amazonaws.com');
  
  if (isS3Image && process.env.NODE_ENV === 'production') {
    // Use regular img tag for S3 images in production to avoid 502 errors
    const { fill, sizes, priority, loading, placeholder, blurDataURL, onLoad, onError, ...imgProps } = props;
    
    return (
      <img
        src={src}
        {...imgProps}
        onLoad={onLoad}
        onError={onError}
        style={fill ? { 
          position: 'absolute',
          height: '100%',
          width: '100%',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          objectFit: 'cover',
          color: 'transparent'
        } : undefined}
      />
    );
  }
  
  // Use Next.js Image component for all other images
  return <Image src={src} {...props} />;
}