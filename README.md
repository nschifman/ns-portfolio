# Noah Schifman Photography Portfolio

A modern, responsive photography portfolio website built with React, TypeScript, and Tailwind CSS.

## Features

- 📸 **Responsive Photo Gallery**: Masonry layout with modern lightbox
- 🎨 **Hero Image Rotation**: Automatic rotation of hero images every 20 seconds
- 📱 **Mobile Optimized**: Works perfectly on all devices
- 🔒 **Advanced Security**: Comprehensive protection against common attacks
- 🚀 **Fast Loading**: Optimized for performance
- 🎯 **SEO Friendly**: Proper meta tags and structure

## Security Features

### 🔒 **Client-Side Protection**
- **Image Protection**: Prevents downloading, right-click saving, and drag-and-drop
- **Keyboard Shortcuts Blocked**: Disables save, developer tools, and view source shortcuts
- **Text Selection Disabled**: Prevents copying of image content
- **Copy/Cut Prevention**: Blocks clipboard operations on images
- **Error Boundaries**: Graceful error handling and recovery

### 🛡️ **Server-Side Security**
- **Content Security Policy (CSP)**: Prevents XSS and injection attacks
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Input Validation**: All user inputs are sanitized and validated
- **File Access Control**: Restricts access to sensitive files and directories
- **Hotlink Protection**: Prevents unauthorized image embedding

### 🔐 **Data Protection**
- **Input Sanitization**: Removes HTML tags and malicious content
- **Path Validation**: Only allows safe image paths from `/photos/` directory
- **Type Checking**: Comprehensive validation of all data structures
- **Error Handling**: Secure error messages without information leakage

## Quick Start

### Development
```bash
# Install dependencies
bun install

# Start development server on port 8080
bun run dev

# Generate photo manifest (after adding photos)
bun run generate-photos
```

### Building for Production

#### For Custom Domain (default)
```bash
bun run build
```

#### For GitHub Pages
```bash
bun run build:github
```

## Photo Management

### Adding Photos
1. Place photos in `public/photos/{category}/` folders
2. Run `bun run generate-photos` to update the manifest
3. The site will automatically detect new categories and photos

### Folder Structure
```
public/photos/
├── heros/           # Hero background images
├── street/          # Street photography
├── wildlife/        # Wildlife photography
└── motorsport/      # Motorsport photography
```

### Hero Images
- Place hero images in `public/photos/heros/`
- Multiple images will rotate automatically
- Single image will display statically

## Deployment

### GitHub Pages
1. Build the project: `bun run build:github`
2. Push to GitHub repository
3. Enable GitHub Pages in repository settings
4. Set source to "Deploy from a branch"
5. Select "main" branch and "/docs" folder

### Custom Domain
1. Build the project: `bun run build`
2. Deploy the `dist` folder to your hosting provider
3. Configure your domain to point to the hosting provider
4. Ensure `.htaccess` file is included for Apache servers

## Security Configuration

### Apache Server (.htaccess)
The included `.htaccess` file provides:
- Security headers configuration
- File access restrictions
- Hotlink protection
- Directory browsing prevention

### Content Security Policy
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
media-src 'self';
```

### Robots.txt
Configured to prevent search engine indexing:
```
User-agent: *
Disallow: /
```

## File Structure

```
src/
├── components/
│   ├── Index.tsx          # Main page component
│   ├── Hero.tsx           # Hero section with rotation
│   ├── Navigation.tsx     # Category navigation
│   ├── PhotoGallery.tsx   # Photo gallery & lightbox
│   └── ui/                # UI components
├── contexts/
│   └── PhotoContext.tsx   # Photo data management with validation
├── lib/
│   └── utils.ts          # Utility functions
├── App.tsx               # Main app with security wrapper
└── main.tsx             # Entry point
```

## Security Best Practices

### For Developers
1. **Input Validation**: Always validate and sanitize user inputs
2. **Error Handling**: Use error boundaries and secure error messages
3. **File Uploads**: Validate file types and restrict access
4. **Dependencies**: Regularly update dependencies for security patches
5. **Code Review**: Review all code changes for security vulnerabilities

### For Deployment
1. **HTTPS**: Always use HTTPS in production
2. **Security Headers**: Ensure all security headers are properly configured
3. **File Permissions**: Set appropriate file permissions on server
4. **Backup**: Regular backups of photo content
5. **Monitoring**: Monitor for unusual access patterns

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Navigation
- **Radix UI** - Accessible components

## License

Private project - All rights reserved. 