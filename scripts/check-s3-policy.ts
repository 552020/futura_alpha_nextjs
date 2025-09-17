import { S3Client, GetBucketPolicyCommand } from '@aws-sdk/client-s3';
import 'dotenv/config'; // load .env automatically
import { S3_BUCKET } from '@/lib/s3';

const region = process.env.AWS_S3_REGION || 'eu-central-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = S3_BUCKET || process.env.AWS_S3_BUCKET;

if (!accessKeyId || !secretAccessKey || !bucket) {
  console.error('Missing required AWS environment variables:');
  console.error({
    AWS_ACCESS_KEY_ID: accessKeyId,
    AWS_SECRET_ACCESS_KEY: secretAccessKey ? '***' : undefined,
    AWS_S3_BUCKET: bucket,
  });
  process.exit(1);
}

const s3Client = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

async function checkBucketPolicy() {
  try {
    const command = new GetBucketPolicyCommand({
      Bucket: bucket,
    });

    const response = await s3Client.send(command);

    if (response.Policy) {
      const policy = JSON.parse(response.Policy);
      console.log('Current Bucket Policy:', JSON.stringify(policy, null, 2));
    } else {
      console.log('No bucket policy is set');
    }
  } catch (error: any) {
    if (error.name === 'NoSuchBucketPolicy') {
      console.log('No bucket policy is set');
    } else {
      console.error('Error checking bucket policy:', error);
    }
  }
}

checkBucketPolicy().catch(console.error);
