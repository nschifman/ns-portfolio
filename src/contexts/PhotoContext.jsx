import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

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
  const [lastFetch, setLastFetch] = useState(0);
  const [cacheTimeout, setCacheTimeout] = useState(5 * 60 * 1000); // 5 minutes in ms

  // Memoized sorting algorithm: 50% views, 50% recency
  const sortPhotos = useCallback((photoList) => {
    if (!photoList || photoList.length === 0) return photoList;
    
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
  }, []);

  const loadPhotos = useCallback(async (forceRefresh = false) => {
    try {
      // Check if we should use cached data
      const now = Date.now();
      const shouldUseCache = !forceRefresh && 
        photos.length > 0 && 
        (now - lastFetch) < cacheTimeout;

      if (shouldUseCache) {
        return;
      }

      setLoading(true);
      setError(null);
      
      // Load photo manifest from dynamic API with optimized timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced to 8 seconds
      
      const url = forceRefresh ? '/api/manifest?refresh=true' : '/api/manifest';
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=600', // Increased cache time
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      
      const manifest = await response.json();
      
      if (!manifest.photos || manifest.photos.length === 0) {
        setError('No photos found. Please upload photos to R2.');
        setPhotos([]);
        return;
      }
      
      const sortedPhotos = sortPhotos(manifest.photos);
      setPhotos(sortedPhotos);
      setLastFetch(now);
    } catch (err) {
      console.error('Error loading photos:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('Failed to load photos. Please try refreshing the page.');
      }
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [photos.length, lastFetch, cacheTimeout, sortPhotos]);

  const refreshPhotos = useCallback(() => {
    loadPhotos(true);
  }, [loadPhotos]);

  useEffect(() => {
    loadPhotos();
    
    // Fallback: if loading takes too long, show error
    const fallbackTimer = setTimeout(() => {
      if (loading) {
        setError('Loading timeout. Please refresh the page.');
        setLoading(false);
      }
    }, 15000); // 15 second fallback
    
    return () => clearTimeout(fallbackTimer);
  }, [loadPhotos, loading]);

  // Memoized categories computation
  const categories = useMemo(() => {
    if (photos.length === 0) return [];
    
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
    
    // Sort categories by number of photos (descending)
    return filteredCategories.sort((a, b) => {
      const aCount = photos.filter(photo => {
        const photoCategory = photo.folder || photo.category;
        return photoCategory === a;
      }).length;
      
      const bCount = photos.filter(photo => {
        const photoCategory = photo.folder || photo.category;
        return photoCategory === b;
      }).length;
      
      return bCount - aCount; // Descending order (most photos first)
    });
  }, [photos]);

  // Memoized photo filtering functions
  const getPhotosByCategory = useCallback((category) => {
    if (!category || photos.length === 0) return [];
    
    return photos.filter(photo => {
      // Check folder first, then category field
      const photoCategory = photo.folder || photo.category;
      return photoCategory === category;
    });
  }, [photos]);

  const getAllPhotos = useCallback(() => {
    if (photos.length === 0) return [];
    
    // Exclude hero photos from the main gallery
    return photos.filter(photo => {
      const photoCategory = photo.folder || photo.category;
      return photoCategory !== 'hero' && photoCategory !== 'Hero';
    });
  }, [photos]);

  // Memoized context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    photos,
    categories,
    loading,
    error,
    getPhotosByCategory,
    getAllPhotos,
    refreshPhotos,
  }), [photos, categories, loading, error, getPhotosByCategory, getAllPhotos, refreshPhotos]);

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
}; 