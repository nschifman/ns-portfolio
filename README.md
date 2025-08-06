# Noah Schifman Photography Portfolio

A modern, fast, and responsive photography portfolio website built with React and Vite.

## Features

- **R2 Integration**: Automatic photo loading from Cloudflare R2 storage
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Lightbox Gallery**: Full-screen photo viewer with keyboard navigation
- **Category Filtering**: Auto-generated categories from R2 folder structure
- **SEO Optimized**: Dynamic meta tags and structured data
- **Fast Loading**: Lazy loading, responsive images, and caching

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (for Cloudflare Pages):
   - `R2_ACCOUNT_ID`: Your Cloudflare R2 account ID
   - `R2_ACCESS_KEY_ID`: Your R2 access key ID
   - `R2_SECRET_ACCESS_KEY`: Your R2 secret access key
   - `R2_BUCKET_NAME`: Your R2 bucket name (default: ns-portfolio-photos)
   - `R2_BUCKET_URL`: Your R2 bucket URL (default: https://photos.noahschifman.com)

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Deploy to Cloudflare Pages**:
   ```bash
   npm run deploy
   ```

## R2 Photo Structure

Organize your photos in R2 like this:

```
your-bucket/
├── hero/                    ← Hero section photos (not a category)
│   ├── hero-sunset.jpg
│   └── hero-mountain.jpg
├── landscapes/              ← Category
│   ├── sunset-mountain.jpg
│   └── ocean-waves.jpg
├── portraits/               ← Category
│   └── model-shoot.jpg
└── street/                  ← Category
    └── city-life.jpg
```

- **Folders become categories** on the website
- **Hero folder** is special and won't appear as a category
- **Photos are automatically detected** and added to the gallery
- **Responsive images** are generated automatically

## Adding New Photos

1. Upload photos to your R2 bucket in the appropriate category folder
2. The website will automatically detect and display them
3. No manual configuration needed!

## Customization

### Styling
- Edit `src/index.css` for custom styles
- Uses Tailwind CSS for utility classes
- Responsive design with mobile-first approach

### Components
- `src/components/Gallery.jsx` - Main gallery component
- `src/contexts/PhotoContext.jsx` - Photo data management
- `functions/api/manifest.js` - R2 photo loading API
- `functions/api/meta.js` - Dynamic meta tags API

### Configuration
- Update `index.html` for SEO and meta tags
- Modify `vite.config.js` for build settings
- Edit `tailwind.config.js` for design system

## Performance Features

- **Lazy Loading**: Images load as you scroll
- **Responsive Images**: Different sizes for different devices
- **Caching**: API responses cached for 5 minutes
- **Code Splitting**: Automatic bundle optimization
- **CDN**: Cloudflare's global network

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

Private - All rights reserved 