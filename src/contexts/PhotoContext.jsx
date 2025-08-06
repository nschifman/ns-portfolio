import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

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

  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/manifest');
      
      if (!response.ok) {
        throw new Error(`Failed to load photos: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.photos || data.photos.length === 0) {
        setError('No photos found. Please upload photos to R2.');
        setPhotos([]);
        return;
      }
      
      // Sort photos by upload date (newest first)
      const sortedPhotos = data.photos.sort((a, b) => {
        const aDate = new Date(a.uploadedAt || 0);
        const bDate = new Date(b.uploadedAt || 0);
        return bDate - aDate;
      });
      
      setPhotos(sortedPhotos);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos. Please try refreshing the page.');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const categorySet = new Set();
    photos.forEach(photo => {
      if (photo.category) {
        categorySet.add(photo.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [photos]);

  // Get photos by category
  const getPhotosByCategory = useCallback((category) => {
    return photos.filter(photo => photo.category === category);
  }, [photos]);

  // Get all photos
  const getAllPhotos = useCallback(() => {
    return photos;
  }, [photos]);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const value = useMemo(() => ({
    photos,
    loading,
    error,
    categories,
    getPhotosByCategory,
    getAllPhotos,
    refreshPhotos: loadPhotos
  }), [photos, loading, error, categories, getPhotosByCategory, getAllPhotos, loadPhotos]);

  return <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>;
}; 