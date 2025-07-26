import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from 'fs';

// Function to generate photo manifest
function generatePhotoManifest() {
  const photosDir = path.join(process.cwd(), 'public/photos');
  const photoManifestFile = path.join(photosDir, 'manifest.json');
  const heroManifestFile = path.join(photosDir, 'hero-manifest.json');
  
  const allPhotos: any[] = [];
  const categories = ['street', 'wildlife', 'motorsport'];
  
  categories.forEach(category => {
    const categoryDir = path.join(photosDir, category);
    if (fs.existsSync(categoryDir)) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const files = fs.readdirSync(categoryDir);
      
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      }).sort((a, b) => {
        // Sort by number if filename starts with number
        const aNum = parseInt(a.match(/^(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.match(/^(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
      
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
    }
  });
  
  // Write the photo manifest file
  const photoManifestData = {
    photos: allPhotos,
    lastUpdated: new Date().toISOString()
  };
  
  fs.writeFileSync(photoManifestFile, JSON.stringify(photoManifestData, null, 2));
  
  // Generate hero manifest
  const herosDir = path.join(photosDir, 'heros');
  let heroImages: string[] = [];
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
  
  return { photos: allPhotos.length, heroes: heroImages.length };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/ns-portfolio/' : '/',
  server: {
    host: "::",
    port: 8080,
    configureServer(server: any) {
      // Add API endpoint for generating manifest
      server.middlewares.use('/api/generate-manifest', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          try {
            const result = generatePhotoManifest();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, ...result }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        } else {
          next();
        }
      });
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
