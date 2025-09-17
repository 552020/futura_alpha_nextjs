import { S3Client, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET } from '@/lib/s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function checkS3Cors() {
  try {
    const command = new GetBucketCorsCommand({
      Bucket: S3_BUCKET,
    });

    const response = await s3Client.send(command);
    console.log('Current CORS Configuration:', JSON.stringify(response.CORSRules, null, 2));
  } catch (error: any) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('No CORS configuration is set for this bucket');
    } else {
      console.error('Error checking CORS configuration:', error);
    }
  }
}

checkS3Cors().catch(console.error);
