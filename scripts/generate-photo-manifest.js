const fs = require('fs');
const path = require('path');

// Function to get all image files from a directory
function getImageFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const files = fs.readdirSync(dir);
  
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext);
  }).sort((a, b) => {
    // Sort by number if filename starts with number
    const aNum = parseInt(a.match(/^(\d+)/)?.[1] || '0');
    const bNum = parseInt(b.match(/^(\d+)/)?.[1] || '0');
    return aNum - bNum;
  });
}

// Function to generate photo manifest
function generatePhotoManifest() {
  const photosDir = path.join(__dirname, '../public/photos');
  const photoManifestFile = path.join(__dirname, '../public/photos/manifest.json');
  const heroManifestFile = path.join(__dirname, '../public/photos/hero-manifest.json');
  
  const allPhotos = [];
  const categories = ['street', 'wildlife', 'motorsport'];
  
  categories.forEach(category => {
    const categoryDir = path.join(photosDir, category);
    const imageFiles = getImageFiles(categoryDir);
    
    imageFiles.forEach((filename, index) => {
      const photoName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
      allPhotos.push({
        id: `${category}-${index + 1}`,
        src: `/photos/${category}/${filename}`,
        alt: photoName,
        category: category,
        filename: photoName
      });
    });
  });
  
  // Write the photo manifest file
  const photoManifestData = {
    photos: allPhotos,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(photoManifestFile, JSON.stringify(photoManifestData, null, 2));
  console.log(`Generated photo manifest with ${allPhotos.length} photos`);
  
  // Generate hero manifest
  const herosDir = path.join(photosDir, 'heros');
  const heroFiles = getImageFiles(herosDir);
  const heroImages = heroFiles.map(filename => `/photos/heros/${filename}`);
  
  // Write the hero manifest file
  const heroManifestData = {
    heroImages: heroImages,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(heroManifestFile, JSON.stringify(heroManifestData, null, 2));
  console.log(`Generated hero manifest with ${heroImages.length} hero images`);
}

// Run the script
generatePhotoManifest(); 