import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import path from 'path';

// R2 Configuration
const R2_ACCOUNT_ID = '7afaf04ebcdccfd4fffc24938a03466d';
const R2_ACCESS_KEY_ID = 'a01231f57659a44c10591c815bb94fae';
const R2_SECRET_ACCESS_KEY = '8097c355c39c04be371378ce732c4c352d39a63757de580ef5e6d7f441c63482';
const R2_BUCKET_NAME = 'ns-portfolio-photos';
const CURRENT_DOMAIN = '000279.xyz'; // Change to 'noahschifman.com' when ready
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

// Helper function to generate alt text from filename
const generateAltText = (filename) => {
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Find images in R2 bucket
const findR2Images = async () => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
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
        const ext = path.extname(key).toLowerCase();
        return imageExtensions.includes(ext);
      });

    console.log(`📸 Found ${imageFiles.length} photos in R2 bucket`);
    return imageFiles;
  } catch (error) {
    console.error('❌ Error scanning R2 bucket:', error);
    return [];
  }
};

export async function onRequest(context) {
  try {
    console.log('🔄 Generating manifest on-demand...');
    
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
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      });
    }

    // Generate manifest
    const photos = imageFiles.map(filePath => {
      // Remove bucket name prefix from path
      const cleanPath = filePath.replace(`${R2_BUCKET_NAME}/`, '');
      const filename = path.basename(cleanPath);
      
      // Extract category from folder path
      const pathParts = cleanPath.split('/');
      const category = pathParts.length > 1 ? pathParts[0] : 'uncategorized';
      
      // Build proper photo URL
      const src = `${R2_BUCKET_URL}/${cleanPath}`;
      
      return {
        id: `${category}-${filename.replace(/\.[^/.]+$/, '')}`,
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
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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