import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { S3_BUCKET } from '@/lib/s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function updateBucketPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowPublicReadAccess',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource: `arn:aws:s3:::${S3_BUCKET}/*`,
      },
      {
        Sid: 'AllowUploads',
        Effect: 'Allow',
        Principal: {
          AWS: process.env.AWS_ACCESS_KEY_ID || '*',
        },
        Action: [
          's3:PutObject',
          's3:PutObjectAcl',
          's3:GetObject',
          's3:ListBucket',
          's3:DeleteObject',
        ],
        Resource: [
          `arn:aws:s3:::${S3_BUCKET}`,
          `arn:aws:s3:::${S3_BUCKET}/*`,
        ],
      },
    ],
  };

  try {
    const command = new PutBucketPolicyCommand({
      Bucket: S3_BUCKET,
      Policy: JSON.stringify(policy),
    });

    await s3Client.send(command);
    console.log('Successfully updated bucket policy');
  } catch (error) {
    console.error('Error updating bucket policy:', error);
    throw error;
  }
}

updateBucketPolicy().catch(console.error);
