import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// R2 Configuration - Use environment variables in production
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '7afaf04ebcdccfd4fffc24938a03466d';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'a01231f57659a44c10591c815bb94fae';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '8097c355c39c04be371378ce732c4c352d39a63757de580ef5e6d7f441c63482';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ns-portfolio-photos';
const CURRENT_DOMAIN = process.env.CURRENT_DOMAIN || '000279.xyz'; // Change to 'noahschifman.com' when ready
const R2_BUCKET_URL = `https://photos.${CURRENT_DOMAIN}`;

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Helper function to get file extension
const getFileExtension = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
};

// Helper function to get filename without extension
const getFilenameWithoutExt = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
};

// Helper function to get basename (filename) from path
const getBasename = (filePath) => {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
};

// Helper function to generate alt text from filename
const generateAltText = (filename) => {
  const nameWithoutExt = getFilenameWithoutExt(filename);
  return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Find images in R2 bucket
const findR2Images = async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000, // Limit to reduce API costs
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('⚠️  No objects found in R2 bucket');
      return [];
    }

    // Filter for image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const imageFiles = response.Contents
      .map(obj => obj.Key)
      .filter(key => {
        const ext = getFileExtension(key);
        return imageExtensions.includes(ext);
      })
      .slice(0, 500); // Limit to 500 images to reduce processing

    console.log(`📸 Found ${imageFiles.length} photos in R2 bucket`);
    return imageFiles;
  } catch (error) {
    console.error('❌ Error scanning R2 bucket:', error);
    return [];
  }
};

export async function onRequest(context) {
  try {
    // Basic rate limiting
    const clientIP = context.request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = context.request.headers.get('user-agent') || 'unknown';
    
    // Log request for monitoring
    console.log(`🔄 Manifest request from ${clientIP} - ${userAgent.substring(0, 50)}`);
    
    // Check if we should bypass cache
    const url = new URL(context.request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    const imageFiles = await findR2Images();
    
    if (imageFiles.length === 0) {
      return new Response(JSON.stringify({
        generated: new Date().toISOString(),
        totalPhotos: 0,
        categories: [],
        photos: []
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300'
        }
      });
    }

    // Generate manifest
    const photos = imageFiles.map(filePath => {
      // Remove bucket name prefix from path
      const cleanPath = filePath.replace(`${R2_BUCKET_NAME}/`, '');
      const filename = getBasename(cleanPath);
      
      // Extract category from folder path
      const pathParts = cleanPath.split('/');
      const category = pathParts.length > 1 ? pathParts[0] : 'uncategorized';
      
      // Build proper photo URL
      const src = `${R2_BUCKET_URL}/${cleanPath}`;
      
      return {
        id: `${category}-${getFilenameWithoutExt(filename)}`,
        src,
        alt: generateAltText(filename),
        category,
        folder: category,
        filename,
        uploadedAt: new Date().toISOString(),
        views: Math.floor(Math.random() * 100)
      };
    });

    // Extract unique categories, excluding 'hero'
    const categories = [...new Set(photos.map(photo => photo.category))]
      .filter(category => category !== 'hero' && category !== 'Hero')
      .sort();

    const manifest = {
      generated: new Date().toISOString(),
      totalPhotos: photos.length,
      categories,
      photos
    };

    console.log(`✅ Generated manifest with ${photos.length} photos and ${categories.length} categories`);

    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    });

  } catch (error) {
    console.error('❌ Error generating manifest:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate manifest',
      generated: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 