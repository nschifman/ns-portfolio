import * as React from 'react';

const PhotoContext = React.createContext();

export const usePhotos = () => {
  const context = React.useContext(PhotoContext);
  if (context === undefined) {
    throw new Error('usePhotos must be used within a PhotoProvider');
  }
  return context;
};

export const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [lastFetch, setLastFetch] = React.useState(0);
  const cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Simplified sorting - just by date
  const sortPhotos = React.useCallback((photoList) => {
    if (!photoList || photoList.length === 0) return photoList;
    
    return photoList.sort((a, b) => {
      const aDate = new Date(a.uploadedAt || a.createdAt || 0);
      const bDate = new Date(b.uploadedAt || b.createdAt || 0);
      return aDate - bDate;
    });
  }, []);

  const loadPhotos = React.useCallback(async (forceRefresh = false) => {
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

  const refreshPhotos = React.useCallback(() => {
    loadPhotos(true);
  }, [loadPhotos]);

  // Optimized categories computation
  const categories = React.useMemo(() => {
    const categorySet = new Set();
    photos.forEach(photo => {
      if (photo.category) {
        categorySet.add(photo.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [photos]);

  // Optimized photo filtering functions
  const getPhotosByCategory = React.useCallback((category) => {
    return photos.filter(photo => photo.category === category);
  }, [photos]);

  const getAllPhotos = React.useCallback(() => {
    return photos;
  }, [photos]);

  // Load photos on mount
  React.useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const value = React.useMemo(() => ({
    photos,
    loading,
    error,
    categories,
    getPhotosByCategory,
    getAllPhotos,
    refreshPhotos,
    loadPhotos
  }), [photos, loading, error, categories, getPhotosByCategory, getAllPhotos, refreshPhotos, loadPhotos]);

  return React.createElement(PhotoContext.Provider, { value }, children);
}; 