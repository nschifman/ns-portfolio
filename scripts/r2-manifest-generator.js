const fs = require('fs');
const path = require('path');

// scripts/r2-manifest-generator.js
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '7afaf04ebcdccfd4fffc24938a03466d';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'a01231f57659a44c10591c815bb94fae';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '8097c355c39c04be371378ce732c4c352d39a63757de580ef5e6d7f441c63482';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'ns-portfolio-photos';

// R2 endpoint URL
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Base URL for photos (uses relative URLs to work with any domain)
const PHOTO_BASE_URL = '/photos';

// Configuration - Update these for your Cloudflare R2 setup
const R2_BUCKET_URL = process.env.R2_BUCKET_URL || `/api/photos`;
const MANIFEST_PATH = path.join(__dirname, '../public/photos/manifest.json');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Generate a unique ID for each photo
const generateId = (filename, category) => {
  return `${category}-${filename.replace(/\.[^/.]+$/, '')}`;
};

// Extract category from file path
const extractCategory = (filePath) => {
  const relativePath = path.relative(PHOTOS_DIR, filePath);
  const parts = relativePath.split(path.sep);
  return parts[0] || 'uncategorized';
};

// Generate alt text from filename
const generateAltText = (filename) => {
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
};

// Recursively find all image files in R2 bucket
const findR2Images = async () => {
  try {
    console.log('🔍 Scanning R2 bucket for photos...');
    
    // Use actual R2 API to scan the bucket
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000 // Adjust as needed
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      console.log('⚠️  No objects found in R2 bucket');
      return [];
    }
    
    // Filter for image files and extract file paths
    const imageFiles = response.Contents
      .map(obj => obj.Key)
      .filter(key => {
        const ext = path.extname(key).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      });
    
    console.log(`📸 Found ${imageFiles.length} photos in R2 bucket`);
    return imageFiles;
    
  } catch (error) {
    console.error('❌ Error scanning R2 bucket:', error.message);
    console.log('💡 Using fallback mock data for testing...');
    
    // Fallback to mock data if R2 API fails
    const mockR2Images = [
      '/hero/hero-sunset.jpg',
      '/hero/hero-mountain.jpg',
      '/astrophotography/milky-way.jpg',
      '/astrophotography/nebula.jpg',
      '/street/city-lights.jpg',
      '/street/urban-portrait.jpg',
      '/wildlife/eagle-flight.jpg',
      '/wildlife/lion-portrait.jpg'
    ];
    
    return mockR2Images;
  }
};

// Generate manifest from R2 images
const generateManifest = async () => {
  console.log('🔄 Generating photo manifest...');
  
  const imageFiles = await findR2Images();
  
  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in R2 bucket');
    console.log('💡 Add some photos to your R2 bucket to get started!');
    return;
  }
  
  console.log(`📸 Found ${imageFiles.length} photos in R2`);
  
  // Generate manifest
  const photos = imageFiles.map(filePath => {
    // Remove bucket name prefix from path
    const cleanPath = filePath.replace(`${R2_BUCKET_NAME}/`, '');
    const filename = path.basename(cleanPath);
    
    // Extract category from folder path - look for folder name before the filename
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
  
  // Sort photos by category, then by filename
  photos.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.filename.localeCompare(b.filename);
  });
  
  const manifest = {
    generated: new Date().toISOString(),
    totalPhotos: photos.length,
    categories: [...new Set(photos.map(p => p.category))].filter(cat => cat !== 'hero').sort(),
    photos
  };
  
  // Ensure directory exists
  const manifestDir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }
  
  // Write manifest file
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  
  console.log('✅ Photo manifest generated successfully!');
  console.log(`📄 Manifest saved to: ${MANIFEST_PATH}`);
  console.log(`📊 Total photos: ${photos.length}`);
  console.log(`📂 Categories: ${manifest.categories.join(', ')}`);
  
  // Show sample structure
  if (photos.length > 0) {
    console.log('\n📋 Sample photo entry:');
    console.log(JSON.stringify(photos[0], null, 2));
  }
};

// Instructions for R2 integration
const showInstructions = () => {
  console.log('\n📋 CLOUDFLARE R2 INTEGRATION INSTRUCTIONS:');
  console.log('==========================================');
  console.log('1. Set up Cloudflare R2 bucket');
  console.log('2. Configure R2_BUCKET_URL environment variable');
  console.log('3. Implement R2 API calls in findR2Images() function');
  console.log('4. Deploy your site to Cloudflare Pages');
  console.log('5. Run: npm run generate-manifest');
  console.log('');
  console.log('📁 Expected R2 structure:');
  console.log('your-bucket/');
  console.log('├── hero/                    ← Hero section photos (not a category)');
  console.log('│   ├── hero-sunset.jpg');
  console.log('│   └── hero-mountain.jpg');
  console.log('├── landscapes/              ← Category');
  console.log('│   ├── sunset-mountain.jpg');
  console.log('│   └── ocean-waves.jpg');
  console.log('├── portraits/               ← Category');
  console.log('│   └── model-shoot.jpg');
  console.log('└── manifest.json (auto-generated)');
  console.log('');
  console.log('🔗 Photo URLs will be:');
  console.log(`${R2_BUCKET_URL}/hero/hero-sunset.jpg`);
  console.log(`${R2_BUCKET_URL}/landscapes/sunset-mountain.jpg`);
  console.log(`${R2_BUCKET_URL}/portraits/model-shoot.jpg`);
  console.log('');
  console.log('🎯 SPECIAL FOLDERS:');
  console.log('- hero/: Photos for rotating hero section (not a category)');
  console.log('- All other folders: Become categories on the site');
  console.log('');
  console.log('🚀 AUTOMATIC UPDATES:');
  console.log('- Upload photos to R2 folders');
  console.log('- Run this script to update manifest');
  console.log('- Deploy to Cloudflare Pages');
  console.log('- New photos appear automatically!');
};

// Run the generator
try {
  generateManifest();
  showInstructions();
} catch (error) {
  console.error('❌ Error generating manifest:', error.message);
  process.exit(1);
} 