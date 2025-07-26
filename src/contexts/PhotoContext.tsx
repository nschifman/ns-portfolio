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

// Default categories with capitalized names
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Street Photography', slug: 'street', orderIndex: 0 },
  { id: '2', name: 'Wildlife', slug: 'wildlife', orderIndex: 1 },
  { id: '3', name: 'Motorsport', slug: 'motorsport', orderIndex: 2 }
];

// Context interface
interface PhotoContextType {
  photos: Photo[];
  categories: Category[];
  getPhotosByCategory: (categorySlug: string) => Photo[];
}

// Create context
const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

// Provider component
export function PhotoProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Function to load photos from manifest
  const loadPhotos = async () => {
    try {
      const response = await fetch('/photos/manifest.json');
      if (response.ok) {
        const manifest = await response.json();
        setPhotos(manifest.photos || []);
        console.log('Photos loaded:', manifest.photos?.length || 0);
      } else {
        console.log('No photo manifest found, using empty gallery');
        setPhotos([]);
      }
    } catch (error) {
      console.log('Failed to load photo manifest, using empty gallery');
      setPhotos([]);
    }
  };

  // Load photos on mount (when site loads/refreshes)
  useEffect(() => {
    loadPhotos();
  }, []);

  // Get photos by category
  const getPhotosByCategory = (categorySlug: string): Photo[] => {
    return photos.filter(photo => photo.category === categorySlug);
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