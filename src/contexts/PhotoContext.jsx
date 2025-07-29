import React, { createContext, useContext, useState, useEffect } from 'react';

const PhotoContext = createContext();

export const usePhotos = () => {
  const context = useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
};

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
        
        // Load photo manifest
        const response = await fetch('/photos/manifest.json');
        if (!response.ok) {
          throw new Error('Failed to load manifest');
        }
        
        const manifest = await response.json();
        
        if (!manifest.photos || manifest.photos.length === 0) {
          setError('No photos found. Please upload photos to R2 and regenerate manifest.');
          setPhotos([]);
          return;
        }
        
        const sortedPhotos = sortPhotos(manifest.photos);
        setPhotos(sortedPhotos);
      } catch (err) {
        console.error('Error loading photos:', err);
        setError('Failed to load photos. Please try refreshing the page.');
        setPhotos([]);
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
    // Exclude hero photos from the main gallery
    return photos.filter(photo => {
      const photoCategory = photo.folder || photo.category;
      return photoCategory !== 'hero' && photoCategory !== 'Hero';
    });
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