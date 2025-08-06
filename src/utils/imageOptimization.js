// Image optimization utilities for responsive image delivery

/**
 * Generate optimized image URLs with multiple resolutions
 * @param {string} baseUrl - The base image URL
 * @param {number[]} widths - Array of desired widths
 * @param {number} quality - Image quality (0-100)
 * @param {string} format - Image format (webp, avif, jpeg)
 * @returns {Array} Array of objects with width and url
 */
export const generateImageUrls = (baseUrl, widths = [640, 1280, 1920, 2560], quality = 85, format = 'webp') => {
  return widths.map(width => ({
    width,
    url: `${baseUrl}?width=${width}&quality=${quality}&format=${format}`
  }));
};

/**
 * Generate srcset string for responsive images
 * @param {Array} urls - Array of image URL objects
 * @returns {string} srcset string
 */
export const generateSrcset = (urls) => {
  return urls.map(({ width, url }) => `${url} ${width}w`).join(', ');
};

/**
 * Generate sizes attribute for responsive images
 * @param {string} defaultSizes - Default sizes string
 * @returns {string} sizes attribute string
 */
export const generateSizes = (defaultSizes = '100vw') => {
  return `(max-width: 640px) 100vw, (max-width: 1024px) 100vw, ${defaultSizes}`;
};

/**
 * Get optimal image dimensions based on container size
 * @param {string} containerType - Type of container (hero, gallery, category, lightbox)
 * @returns {Object} Object with width and height arrays
 */
export const getImageDimensions = (containerType) => {
  const dimensions = {
    hero: {
      widths: [1280, 1920, 2560, 3200],
      sizes: '100vw',
      aspectRatio: '16/9'
    },
    gallery: {
      widths: [640, 1280, 1920],
      sizes: '(max-width: 640px) 100vw, 50vw',
      aspectRatio: '3/4'
    },
    category: {
      widths: [640, 1280, 1920],
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
      aspectRatio: '4/3'
    },
    lightbox: {
      widths: [1280, 1920, 2560, 3200],
      sizes: '90vw',
      aspectRatio: 'auto'
    }
  };
  
  return dimensions[containerType] || dimensions.gallery;
};

/**
 * Preload critical images for better performance
 * @param {string} url - Image URL to preload
 * @param {string} type - Image type (image/webp, image/jpeg, etc.)
 */
export const preloadImage = (url, type = 'image/webp') => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.type = type;
  document.head.appendChild(link);
};

/**
 * Generate optimized picture element props
 * @param {string} baseUrl - Base image URL
 * @param {string} containerType - Container type
 * @param {Object} options - Additional options
 * @returns {Object} Picture element props
 */
export const generatePictureProps = (baseUrl, containerType, options = {}) => {
  const dimensions = getImageDimensions(containerType);
  const imageUrls = generateImageUrls(baseUrl, dimensions.widths, options.quality || 85, options.format || 'webp');
  const srcset = generateSrcset(imageUrls);
  const sizes = generateSizes(dimensions.sizes);
  
  return {
    srcset,
    sizes,
    fallbackUrl: imageUrls[Math.floor(imageUrls.length / 2)].url, // Use middle resolution as fallback
    width: dimensions.widths[Math.floor(dimensions.widths.length / 2)],
    height: dimensions.widths[Math.floor(dimensions.widths.length / 2)] * (dimensions.aspectRatio === '16/9' ? 9/16 : dimensions.aspectRatio === '3/4' ? 4/3 : dimensions.aspectRatio === '4/3' ? 3/4 : 1)
  };
};

/**
 * Check if WebP is supported
 * @returns {Promise<boolean>} True if WebP is supported
 */
export const isWebPSupported = () => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Get optimal format based on browser support
 * @returns {Promise<string>} Optimal image format
 */
export const getOptimalFormat = async () => {
  const webPSupported = await isWebPSupported();
  return webPSupported ? 'webp' : 'jpeg';
}; 