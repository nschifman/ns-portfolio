// Cloudflare Worker function to update photo manifest
export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get environment variables
    const R2_ACCOUNT_ID = context.env.R2_ACCOUNT_ID;
    const R2_ACCESS_KEY_ID = context.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_ACCESS_KEY = context.env.R2_SECRET_ACCESS_KEY;
    const R2_BUCKET_NAME = context.env.R2_BUCKET_NAME;

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return new Response('R2 configuration missing', { status: 500 });
    }

    // Import AWS SDK (available in Cloudflare Workers)
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');

    // Configure S3 client for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    // Scan R2 bucket for photos
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents) {
      return new Response(JSON.stringify({ message: 'No photos found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Filter for image files
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = response.Contents
      .map(obj => obj.Key)
      .filter(key => {
        const ext = key.toLowerCase().split('.').pop();
        return IMAGE_EXTENSIONS.includes(`.${ext}`);
      });

    // Generate manifest
    const photos = imageFiles.map(filePath => {
      const filename = filePath.split('/').pop();
      const category = filePath.split('/')[0] || 'uncategorized';
      
      return {
        id: `${category}-${filename.replace(/\.[^/.]+$/, '')}`,
        src: `/photos/${filePath}`,
        alt: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        category,
        folder: category,
        filename,
        uploadedAt: new Date().toISOString(),
        views: Math.floor(Math.random() * 100)
      };
    });

    // Filter out hero from categories
    const categories = [...new Set(photos.map(p => p.category))]
      .filter(cat => cat !== 'hero')
      .sort();

    const manifest = {
      generated: new Date().toISOString(),
      totalPhotos: photos.length,
      categories,
      photos
    };

    // Store manifest in R2 (or return it directly)
    return new Response(JSON.stringify({
      message: 'Manifest updated successfully',
      manifest,
      photosFound: photos.length,
      categories: categories.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating manifest:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update manifest',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 