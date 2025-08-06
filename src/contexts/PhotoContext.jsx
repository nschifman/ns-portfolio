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
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Simplified sorting - just by date
  const sortPhotos = useCallback((photoList) => {
    if (!photoList || photoList.length === 0) return photoList;
    
    return photoList.sort((a, b) => {
      const aDate = new Date(a.uploadedAt || a.createdAt || 0);
      const bDate = new Date(b.uploadedAt || b.createdAt || 0);
      return aDate - bDate;
    });
  }, []);

  const loadPhotos = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache
      const now = Date.now();
      const shouldUseCache = !forceRefresh && 
        photos.length > 0 && 
        (now - lastFetch) < cacheTimeout;

      if (shouldUseCache) {
        return;
      }

      setLoading(true);
      setError(null);
      
      // Optimized fetch with shorter timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const url = forceRefresh ? '/api/manifest?refresh=true' : '/api/manifest';
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300',
          'Accept': 'application/json'
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
      
      // Simplified photo processing
      const processedPhotos = manifest.photos.map(photo => ({
        ...photo,
        mobilePreviewSrc: photo.mobilePreviewSrc || photo.previewSrc || photo.src,
        tabletPreviewSrc: photo.tabletPreviewSrc || photo.previewSrc || photo.src,
        desktopPreviewSrc: photo.desktopPreviewSrc || photo.previewSrc || photo.src
      }));
      
      const sortedPhotos = sortPhotos(processedPhotos);
      setPhotos(sortedPhotos);
      setLastFetch(now);
    } catch (err) {
      console.error('Error loading photos:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
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

  // Optimized categories computation
  const categories = useMemo(() => {
    if (photos.length === 0) return [];
    
    const uniqueCategories = [...new Set(photos.map(photo => 
      photo.folder || photo.category
    ))];
    
    return uniqueCategories
      .filter(category => category !== 'hero' && category !== 'Hero')
      .sort((a, b) => {
        const aCount = photos.filter(photo => 
          (photo.folder || photo.category) === a
        ).length;
        
        const bCount = photos.filter(photo => 
          (photo.folder || photo.category) === b
        ).length;
        
        return bCount - aCount;
      });
  }, [photos]);

  // Optimized photo filtering
  const getPhotosByCategory = useCallback((category) => {
    if (!category || photos.length === 0) return [];
    
    return photos.filter(photo => {
      const photoCategory = photo.folder || photo.category;
      return photoCategory === category;
    });
  }, [photos]);

  const getAllPhotos = useCallback(() => {
    if (photos.length === 0) return [];
    
    return photos.filter(photo => {
      const photoCategory = photo.folder || photo.category;
      return photoCategory !== 'hero' && photoCategory !== 'Hero';
    });
  }, [photos]);

  // Memoized context value
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