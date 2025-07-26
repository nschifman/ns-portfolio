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
  const photosDir = path.join(process.cwd(), 'public/photos');
  const photoManifestFile = path.join(photosDir, 'manifest.json');
  const heroManifestFile = path.join(photosDir, 'hero-manifest.json');
  
  const allPhotos = [];
  
  // Get all subdirectories (categories) automatically
  const categories = fs.readdirSync(photosDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => name !== 'heros'); // Exclude heros folder from categories
  
  console.log(`Found categories: ${categories.join(', ')}`);
  
  categories.forEach(category => {
    const categoryDir = path.join(photosDir, category);
    const imageFiles = getImageFiles(categoryDir);
    
    console.log(`Processing ${category}: ${imageFiles.length} photos`);
    
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
  let heroImages = [];
  if (fs.existsSync(herosDir)) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const files = fs.readdirSync(herosDir);
    
    const heroFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    }).sort((a, b) => {
      const aNum = parseInt(a.match(/^(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.match(/^(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });
    
    heroImages = heroFiles.map(filename => `/photos/heros/${filename}`);
  }
  
  // Write the hero manifest file
  const heroManifestData = {
    heroImages: heroImages,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(heroManifestFile, JSON.stringify(heroManifestData, null, 2));
  console.log(`Generated hero manifest with ${heroImages.length} hero images`);
  
  return { photos: allPhotos.length, heroes: heroImages.length };
}

// Run the function if this script is executed directly
if (require.main === module) {
  generatePhotoManifest();
}

module.exports = { generatePhotoManifest }; 