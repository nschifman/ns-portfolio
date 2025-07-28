import React, { createContext, useContext, useState, useEffect } from 'react';

const PhotoContext = createContext();

export const usePhotos = () => {
  const context = useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
};

// Fallback data in case manifest fails to load
const fallbackPhotos = [
  {
    id: 'landscapes-sunset-mountain',
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    alt: 'Sunset Mountain',
    category: 'landscapes',
    filename: 'sunset-mountain.jpg',
    uploadedAt: new Date().toISOString(),
    views: 85
  },
  {
    id: 'portraits-model-shoot',
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    alt: 'Model Shoot',
    category: 'portraits',
    filename: 'model-shoot.jpg',
    uploadedAt: new Date().toISOString(),
    views: 78
  }
];

export const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting algorithm: 50% views, 50% recency
  const sortPhotos = (photoList) => {
    return photoList.sort((a, b) => {
      const now = new Date();
      const aAge = (now - new Date(a.uploadedAt || a.createdAt || now)) / (1000 * 60 * 60 * 24); // days
      const bAge = (now - new Date(b.uploadedAt || b.createdAt || now)) / (1000 * 60 * 60 * 24);
      
      const aViews = a.views || 0;
      const bViews = b.views || 0;
      
      // Normalize scores (0-1)
      const maxViews = Math.max(...photoList.map(p => p.views || 0), 1);
      const maxAge = Math.max(...photoList.map(p => {
        const age = (now - new Date(p.uploadedAt || p.createdAt || now)) / (1000 * 60 * 60 * 24);
        return age;
      }), 1);
      
      const aViewScore = aViews / maxViews;
      const bViewScore = bViews / maxViews;
      const aRecencyScore = 1 - (aAge / maxAge);
      const bRecencyScore = 1 - (bAge / maxAge);
      
      // 50% views, 50% recency
      const aScore = (aViewScore * 0.5) + (aRecencyScore * 0.5);
      const bScore = (bViewScore * 0.5) + (bRecencyScore * 0.5);
      
      return bScore - aScore; // Higher score first
    });
  };

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load photo manifest from Cloudflare R2
        const response = await fetch('/photos/manifest.json');
        if (!response.ok) {
          console.warn('Failed to load manifest, using fallback data');
          const sortedPhotos = sortPhotos(fallbackPhotos);
          setPhotos(sortedPhotos);
          return;
        }
        
        const manifest = await response.json();
        
        // Check if we have real photos or just fake data
        const hasRealPhotos = manifest.photos && manifest.photos.length > 0;
        
        if (!hasRealPhotos) {
          console.log('No real photos found in manifest');
          setError('No photos found. Please upload photos to R2 and regenerate manifest.');
          setPhotos([]);
          return;
        }
        
        const sortedPhotos = sortPhotos(manifest.photos || fallbackPhotos);
        setPhotos(sortedPhotos);
      } catch (err) {
        console.error('Error loading photos:', err);
        console.log('Using fallback data');
        const sortedPhotos = sortPhotos(fallbackPhotos);
        setPhotos(sortedPhotos);
        setError(null); // Don't show error, use fallback instead
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  const categories = React.useMemo(() => {
    // Extract categories from photo paths/folders, excluding 'hero'
    const uniqueCategories = [...new Set(photos.map(photo => {
      // If photo has a folder path, extract category from it
      if (photo.folder) {
        return photo.folder;
      }
      // Fallback to category field
      return photo.category;
    }))];
    
    // Filter out 'hero' folder - it's not a category
    const filteredCategories = uniqueCategories.filter(category => 
      category !== 'hero' && category !== 'Hero'
    );
    
    return filteredCategories.sort();
  }, [photos]);

  const getPhotosByCategory = (category) => {
    return photos.filter(photo => {
      // Check folder first, then category field
      const photoCategory = photo.folder || photo.category;
      return photoCategory === category;
    });
  };

  const getAllPhotos = () => {
    return photos;
  };

  const value = {
    photos,
    categories,
    loading,
    error,
    getPhotosByCategory,
    getAllPhotos,
  };

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
}; 