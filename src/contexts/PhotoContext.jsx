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




  // Memoized sorting algorithm: prioritize recency (most recently added last - at bottom)
  const sortPhotos = useCallback((photoList) => {
    if (!photoList || photoList.length === 0) return photoList;
    
    return photoList.sort((a, b) => {
      // Sort by upload/creation date - most recent last (at bottom)
      const aDate = new Date(a.uploadedAt || a.createdAt || 0);
      const bDate = new Date(b.uploadedAt || b.createdAt || 0);
      
      return aDate - bDate; // Oldest first, newest at bottom
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
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const url = forceRefresh ? '/api/manifest?refresh=true' : '/api/manifest';
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300', // 5 minute cache
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-App/1.0)'
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
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err.message.includes('404')) {
        setError('Photos not found. Please check back later.');
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
  }, [loadPhotos]);

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
    refreshPhotos
  }), [photos, categories, loading, error, getPhotosByCategory, getAllPhotos, refreshPhotos]);

  return (
    <PhotoContext.Provider value={value}>
      {children}
    </PhotoContext.Provider>
  );
}; 