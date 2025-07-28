const fs = require('fs');
const path = require('path');

// Create test photos directory structure
const createTestStructure = () => {
  const photosDir = path.join(__dirname, '../public/photos');
  
  // Create directories
  const categories = ['landscapes', 'portraits', 'wildlife'];
  categories.forEach(category => {
    const categoryDir = path.join(photosDir, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
  });
  
  // Create sample manifest for testing
  const samplePhotos = [
    {
      id: 'landscapes-sunset-mountain',
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      alt: 'Sunset Mountain',
      category: 'landscapes',
      filename: 'sunset-mountain.jpg',
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      views: 85
    },
    {
      id: 'landscapes-ocean-waves',
      src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
      alt: 'Ocean Waves',
      category: 'landscapes',
      filename: 'ocean-waves.jpg',
      uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      views: 92
    },
    {
      id: 'portraits-model-shoot',
      src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
      alt: 'Model Shoot',
      category: 'portraits',
      filename: 'model-shoot.jpg',
      uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      views: 78
    },
    {
      id: 'portraits-street-portrait',
      src: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=800&h=600&fit=crop',
      alt: 'Street Portrait',
      category: 'portraits',
      filename: 'street-portrait.jpg',
      uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      views: 65
    },
    {
      id: 'wildlife-eagle-flight',
      src: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=800&h=600&fit=crop',
      alt: 'Eagle Flight',
      category: 'wildlife',
      filename: 'eagle-flight.jpg',
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      views: 95
    },
    {
      id: 'wildlife-lion-portrait',
      src: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=800&h=600&fit=crop',
      alt: 'Lion Portrait',
      category: 'wildlife',
      filename: 'lion-portrait.jpg',
      uploadedAt: new Date().toISOString(), // Today
      views: 45
    }
  ];
  
  const manifest = {
    generated: new Date().toISOString(),
    totalPhotos: samplePhotos.length,
    categories: categories,
    photos: samplePhotos
  };
  
  // Write manifest
  fs.writeFileSync(path.join(photosDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  
  console.log('✅ Test photos structure created!');
  console.log(`📁 Created ${categories.length} categories: ${categories.join(', ')}`);
  console.log(`📸 Added ${samplePhotos.length} sample photos`);
  console.log('🌐 Using Unsplash images for testing');
  console.log('📊 Photos include views and upload dates for sorting algorithm');
  console.log('\n🚀 Run "npm run dev" to test locally!');
};

createTestStructure(); 