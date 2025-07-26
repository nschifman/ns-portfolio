import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simple types
export interface Photo {
  id: string;
  src: string;
  alt: string;
  category: string;
  filename: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  orderIndex: number;
}

// Context interface
interface PhotoContextType {
  photos: Photo[];
  categories: Category[];
  getPhotosByCategory: (categorySlug: string) => Photo[];
}

// Create context
const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

// Security: Input validation and sanitization
const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim()
    .substring(0, 100); // Limit length
};

// Security: Validate image source
const isValidImageSource = (src: string): boolean => {
  if (typeof src !== 'string') return false;
  
  // Only allow relative paths starting with /photos/
  const validPattern = /^\/photos\/[a-zA-Z0-9\s\-_\/]+\.(jpg|jpeg|png|gif|webp)$/i;
  return validPattern.test(src);
};

// Helper function to convert category name to slug
const categoryToSlug = (categoryName: string): string => {
  const sanitized = sanitizeString(categoryName);
  return sanitized.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
};

// Helper function to convert slug back to category name
const slugToCategory = (slug: string): string => {
  const sanitized = sanitizeString(slug);
  return sanitized.replace(/-/g, ' ');
};

// Provider component
export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Function to load photos from manifest
  const loadPhotos = async () => {
    try {
      const response = await fetch('/photos/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        
        // Security: Validate and sanitize photo data
        const validatedPhotos: Photo[] = [];
        if (Array.isArray(manifest.photos)) {
          manifest.photos.forEach((photo: any) => {
            if (
              photo &&
              typeof photo === 'object' &&
              isValidImageSource(photo.src) &&
              typeof photo.alt === 'string' &&
              typeof photo.category === 'string' &&
              typeof photo.filename === 'string'
            ) {
              validatedPhotos.push({
                id: sanitizeString(photo.id || `${photo.category}-${Date.now()}`),
                src: photo.src,
                alt: sanitizeString(photo.alt),
                category: sanitizeString(photo.category),
                filename: sanitizeString(photo.filename)
              });
            }
          });
        }
        
        setPhotos(validatedPhotos);
        
        // Generate categories automatically from photos
        const categorySet = new Set<string>();
        validatedPhotos.forEach((photo: Photo) => {
          categorySet.add(photo.category);
        });
        
        const autoCategories: Category[] = Array.from(categorySet).map((category, index) => ({
          id: (index + 1).toString(),
          name: category.replace(/([A-Z])/g, ' $1').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ').trim(),
          slug: categoryToSlug(category),
          orderIndex: index
        }));
        
        setCategories(autoCategories);
      } else {
        setPhotos([]);
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
      setPhotos([]);
      setCategories([]);
    }
  };

  // Load photos on mount (when site loads/refreshes)
  useEffect(() => {
    loadPhotos();
  }, []);

  // Get photos by category
  const getPhotosByCategory = (categorySlug: string): Photo[] => {
    const sanitizedSlug = sanitizeString(categorySlug);
    const categoryName = slugToCategory(sanitizedSlug);
    return photos.filter(photo => photo.category === categoryName);
  };

  const value: PhotoContextType = {
    photos,
    categories,
    getPhotosByCategory
  };

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
}

// Hook to use the photo context
export function usePhotos() {
  const context = useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
} 