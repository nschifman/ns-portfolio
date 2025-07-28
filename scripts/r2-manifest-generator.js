const fs = require('fs');
const path = require('path');

// scripts/r2-manifest-generator.js
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'your-account-id';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'your-access-key-id';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'your-secret-access-key';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'noahschifman-photos';

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
const R2_BUCKET_URL = process.env.R2_BUCKET_URL || '/photos';
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
    
    // In a real implementation, you would use Cloudflare R2 API
    // For now, we'll simulate finding images from a local structure
    // This will be replaced with actual R2 API calls
    
    // Simulate R2 API response
    const mockR2Images = [
      '/landscapes/sunset-mountain.jpg',
      '/landscapes/ocean-waves.jpg',
      '/portraits/model-shoot.jpg',
      '/portraits/street-portrait.jpg',
      '/wildlife/eagle-flight.jpg',
      '/wildlife/lion-portrait.jpg'
    ];
    
    return mockR2Images;
  } catch (error) {
    console.error('Error scanning R2 bucket:', error);
    return [];
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
  
  const photos = imageFiles.map(filePath => {
    const filename = path.basename(filePath);
    const category = filePath.split('/')[1] || 'uncategorized';
    const src = `${R2_BUCKET_URL}${filePath}`; // R2 URL
    
    return {
      id: generateId(filename, category),
      src,
      alt: generateAltText(filename),
      category,
      folder: category,
      filename,
      uploadedAt: new Date().toISOString(), // Will be replaced with actual upload date
      views: Math.floor(Math.random() * 100) // Will be replaced with actual view count
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
    categories: [...new Set(photos.map(p => p.category))].sort(),
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
  console.log('├── landscapes/');
  console.log('│   ├── sunset-mountain.jpg');
  console.log('│   └── ocean-waves.jpg');
  console.log('├── portraits/');
  console.log('│   └── model-shoot.jpg');
  console.log('└── manifest.json (auto-generated)');
  console.log('');
  console.log('🔗 Photo URLs will be:');
  console.log(`${R2_BUCKET_URL}/landscapes/sunset-mountain.jpg`);
  console.log(`${R2_BUCKET_URL}/portraits/model-shoot.jpg`);
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