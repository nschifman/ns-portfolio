import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Initialize S3 client for R2
const createS3Client = (context) => {
  // R2 Configuration - Use environment variables in production
  const R2_ACCOUNT_ID = context.env.R2_ACCOUNT_ID || '7afaf04ebcdccfd4fffc24938a03466d';
  const R2_ACCESS_KEY_ID = context.env.R2_ACCESS_KEY_ID || 'a01231f57659a44c10591c815bb94fae';
  const R2_SECRET_ACCESS_KEY = context.env.R2_SECRET_ACCESS_KEY || '8097c355c39c04be371378ce732c4c352d39a63757de580ef5e6d7f441c63482';
  const R2_BUCKET_NAME = context.env.R2_BUCKET_NAME || 'ns-portfolio-photos';
  const CURRENT_DOMAIN = context.env.CURRENT_DOMAIN || '000279.xyz';

  return {
    s3Client: new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    }),
    R2_BUCKET_NAME,
    CURRENT_DOMAIN
  };
};

// Helper function to get file extension
const getFileExtension = (filename) => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
};

// Helper function to get basename from path
const getBasename = (filePath) => {
  const lastSlash = filePath.lastIndexOf('/');
  return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
};

// Find images in R2 bucket
const findR2Images = async (s3Client, R2_BUCKET_NAME) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1000,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
    const imageFiles = response.Contents
      .map(obj => obj.Key)
      .filter(key => {
        const ext = getFileExtension(key);
        return imageExtensions.includes(ext);
      })
      .slice(0, 500);

    return imageFiles;
  } catch (error) {
    console.error('❌ Error scanning R2 bucket:', error);
    return [];
  }
};

export async function onRequest(context) {
  try {
    const { s3Client, R2_BUCKET_NAME, CURRENT_DOMAIN } = createS3Client(context);
    const imageFiles = await findR2Images(s3Client, R2_BUCKET_NAME);
    
    if (imageFiles.length === 0) {
      return new Response(JSON.stringify({
        title: "Professional Photography Portfolio | nschify",
        description: "Professional photography portfolio featuring stunning landscapes, portraits, and street photography. Follow @nschify on Instagram for more.",
        keywords: "photography, photography portfolio, landscape photography, portrait photography, street photography, nschify, professional photographer",
        categories: [],
        totalPhotos: 0,
        generated: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      });
    }

    // Extract categories from image files
    const categories = [...new Set(imageFiles.map(filePath => {
      const pathParts = filePath.split('/');
      return pathParts.length > 1 ? pathParts[0] : 'uncategorized';
    }))]
    .filter(category => category !== 'hero' && category !== 'Hero')
    .sort();

    // Generate dynamic meta content
    const categoryList = categories.join(', ');
    const totalPhotos = imageFiles.length;
    
    // Create dynamic title and description
    const title = `Professional Photography Portfolio | ${categories.length > 0 ? categories.join(', ') : 'Landscapes, Portraits'} | nschify`;
    const description = `Professional photography portfolio featuring ${categoryList || 'stunning landscapes, portraits, and street photography'}. ${totalPhotos}+ high-quality photos. Follow @nschify on Instagram for more.`;
    const keywords = `photography, photography portfolio, ${categoryList.replace(/,/g, ' photography,')} photography, nschify, professional photographer`;

    const metaData = {
      title,
      description,
      keywords,
      categories,
      totalPhotos,
      categoryCounts: categories.map(cat => ({
        name: cat,
        count: imageFiles.filter(file => file.startsWith(cat + '/')).length
      })),
      generated: new Date().toISOString()
    };

    return new Response(JSON.stringify(metaData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });

  } catch (error) {
    console.error('❌ Error generating meta data:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate meta data',
      generated: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 