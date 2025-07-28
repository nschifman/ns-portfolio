// R2 Usage Monitor - Prevents going over limits
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Free tier limits (adjust based on your plan)
const FREE_TIER_LIMITS = {
  storage: 10 * 1024 * 1024 * 1024, // 10GB
  requests: 1000000, // 1M requests/month
  bandwidth: 10 * 1024 * 1024 * 1024 // 10GB
};

// Alert thresholds (80% of limits)
const ALERT_THRESHOLDS = {
  storage: FREE_TIER_LIMITS.storage * 0.8,
  requests: FREE_TIER_LIMITS.requests * 0.8,
  bandwidth: FREE_TIER_LIMITS.bandwidth * 0.8
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function checkR2Usage() {
  try {
    console.log('🔍 Checking R2 usage...');
    
    // Get bucket info
    const headCommand = new HeadBucketCommand({ Bucket: R2_BUCKET_NAME });
    await s3Client.send(headCommand);
    
    // List all objects to calculate storage
    const listCommand = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME });
    const response = await s3Client.send(listCommand);
    
    let totalSize = 0;
    let totalObjects = 0;
    
    if (response.Contents) {
      response.Contents.forEach(obj => {
        totalSize += obj.Size || 0;
        totalObjects++;
      });
    }
    
    console.log(`📊 Current Usage:`);
    console.log(`   Storage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Objects: ${totalObjects}`);
    console.log(`   Storage %: ${((totalSize / FREE_TIER_LIMITS.storage) * 100).toFixed(2)}%`);
    
    // Check if approaching limits
    if (totalSize > ALERT_THRESHOLDS.storage) {
      console.warn('⚠️  WARNING: Approaching storage limit!');
      await sendAlert('Storage', totalSize, FREE_TIER_LIMITS.storage);
    }
    
    if (totalObjects > 1000) {
      console.warn('⚠️  WARNING: High number of objects!');
    }
    
    return { totalSize, totalObjects };
    
  } catch (error) {
    console.error('❌ Error checking R2 usage:', error);
    throw error;
  }
}

async function sendAlert(type, current, limit) {
  // Simple console alert - you can extend this to send emails
  console.error(`🚨 ALERT: ${type} usage at ${((current / limit) * 100).toFixed(2)}%`);
  console.error(`   Current: ${(current / 1024 / 1024).toFixed(2)} MB`);
  console.error(`   Limit: ${(limit / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.error(`   Action: Consider upgrading plan or cleaning up files`);
}

// Run check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkR2Usage()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { checkR2Usage }; 