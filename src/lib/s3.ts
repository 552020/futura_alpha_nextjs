import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { generateS3Key } from './s3-service';

// S3 Configuration
const s3Config = {
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};

console.log('S3 Config:', s3Config);

const s3Client = new S3Client(s3Config);

export const S3_BUCKET = process.env.AWS_S3_BUCKET || '';
export const S3_REGION = process.env.AWS_S3_REGION || 'eu-central-1';

console.log('S3 Bucket:', S3_BUCKET);
console.log('S3 Region:', S3_REGION);

// Check if S3 is properly configured
export function isS3Configured(): boolean {
  const configured = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
  console.log('Is S3 Configured?', configured);
  return configured;
}

// Upload file to S3
export async function uploadToS3(file: File, buffer?: Buffer, userId?: string): Promise<string> {
  if (!isS3Configured()) {
    throw new Error('S3 is not properly configured. Please check your environment variables.');
  }

  const fileBuffer = buffer || Buffer.from(await file.arrayBuffer());
  const cleanFileName = file.name.split('/').pop() || file.name; // Remove any path from the file name
  // Use unified S3 key generation for consistent folder structure
  const fileName = generateS3Key(cleanFileName, userId || 'anonymous');

  const uploadParams: PutObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: file.type,
    CacheControl: 'max-age=31536000', // 1 year cache
    // ACL: 'public-read', // Make the object publicly readable
  };

  console.log('Uploading to S3 with params:', uploadParams);

  try {
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const publicUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;
    console.log('Uploaded file public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

// Extract S3 key from URL
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('s3') || urlObj.hostname.includes('amazonaws.com')) {
      const key = urlObj.pathname.slice(1);
      console.log('Extracted S3 key from URL:', key);
      return key;
    }
    return null;
  } catch {
    return null;
  }
}
