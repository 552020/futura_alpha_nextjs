import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET } from '@/lib/s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function setS3Cors() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: S3_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: [
              'http://localhost:3000',
              'https://your-production-domain.com' // Replace with your actual domain
            ],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });

    await s3Client.send(command);
    console.log('Successfully set CORS configuration');
  } catch (error) {
    console.error('Error setting CORS configuration:', error);
    throw error;
  }
}

setS3Cors().catch(console.error);
