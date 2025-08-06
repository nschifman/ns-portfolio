# Noah Schifman Photography Portfolio

A modern, high-performance photography portfolio built with React, Vite, and Tailwind CSS.

## Features

- **Modern React 18** with automatic JSX transform
- **High Performance** with lazy loading and optimized image loading
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Lightbox Gallery** with keyboard navigation
- **Category Filtering** for organized photo browsing
- **Security Features** to protect photo content
- **SEO Optimized** with dynamic meta tags

## Tech Stack

- **Frontend**: React 18.2.0, React Router DOM 6.8.0
- **Build Tool**: Vite 5.0.0
- **Styling**: Tailwind CSS 3.3.5
- **Deployment**: GitHub Pages with GitHub Actions

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nschifman/ns-portfolio.git
cd ns-portfolio
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Preview production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Gallery.jsx          # Main photo gallery component
│   └── DynamicMeta.jsx      # SEO meta tag management
├── contexts/
│   └── PhotoContext.jsx     # Photo data and state management
├── App.jsx                  # Main application component
├── main.jsx                 # Application entry point
└── index.css               # Global styles and Tailwind imports
```

## Key Improvements

### Performance Optimizations
- **Lazy Loading**: Gallery component loads on demand
- **Image Optimization**: Responsive images with proper srcset
- **Code Splitting**: Vendor and router chunks separated
- **Caching**: 5-minute cache for photo manifest
- **Bundle Optimization**: ESBuild minification with console removal

### Modern React Patterns
- **Automatic JSX Transform**: No need to import React in every file
- **Named Imports**: Proper React hook imports for better tree-shaking
- **Functional Components**: Modern React patterns throughout
- **Context API**: Efficient state management

### Security Features
- **Right-click Protection**: Prevents image saving
- **Drag Prevention**: Blocks drag and drop
- **Keyboard Shortcut Blocking**: Prevents developer tools access
- **Touch Event Handling**: Optimized for mobile interaction

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **CSS Grid**: Flexible photo grid layout
- **Touch-Friendly**: Proper touch targets and interactions
- **Safe Area Support**: iOS safe area handling

## Deployment

### GitHub Pages (Automatic)

The site automatically deploys to GitHub Pages when you push to the `main` branch. The GitHub Actions workflow:

1. **Builds** the React application using Vite
2. **Deploys** to GitHub Pages using the `dist` folder
3. **Handles routing** with HashRouter for SPA compatibility

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

### Environment Variables

For local development, you may need to configure API endpoints:
- `/api/manifest` - Photo manifest endpoint
- `/api/meta` - SEO meta data endpoint

## API Integration

The application expects the following API structure:

### Manifest API (`/api/manifest`)
```json
{
  "photos": [
    {
      "id": "unique-id",
      "title": "Photo Title",
      "description": "Photo description",
      "src": "full-resolution-url",
      "previewSrc": "preview-url",
      "mobilePreviewSrc": "mobile-preview-url",
      "tabletPreviewSrc": "tablet-preview-url",
      "desktopPreviewSrc": "desktop-preview-url",
      "category": "category-name",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Meta API (`/api/meta`)
```json
{
  "title": "Page Title",
  "description": "Page description",
  "keywords": "keyword1, keyword2",
  "categories": ["category1", "category2"]
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary. All rights reserved. 