import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

function Gallery() {
  const { category } = useParams();
  const { photos, categories, loading, error, getPhotosByCategory, getAllPhotos } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [lightboxSize, setLightboxSize] = useState({ width: 0, height: 0 });
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [visibleImages, setVisibleImages] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const observerRef = useRef(null);
  const observerOptions = useMemo(() => ({
    rootMargin: '100px 0px', // Increased for better performance
    threshold: 0.1
  }), []);

  // Get current category name from URL
  const currentCategory = category || '';
  
  // Get photos for current category or all photos if no category
  const currentPhotos = useMemo(() => {
    return currentCategory ? getPhotosByCategory(currentCategory) : getAllPhotos();
  }, [currentCategory, getPhotosByCategory, getAllPhotos]);

  // Optimized Intersection Observer for scroll-based loading
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const newVisibleImages = new Set(visibleImages);
        let hasChanges = false;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const photoId = entry.target.dataset.photoId;
            if (photoId && !newVisibleImages.has(photoId)) {
              newVisibleImages.add(photoId);
              hasChanges = true;
            }
          }
        });
        
        if (hasChanges) {
          setVisibleImages(newVisibleImages);
        }
      },
      observerOptions
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [observerOptions, visibleImages]);

  // Handle image load with debouncing
  const handleImageLoad = useCallback((photoId) => {
    setLoadedImages(prev => {
      if (prev.has(photoId)) return prev;
      return new Set(prev).add(photoId);
    });
  }, []);

  // Handle photo click for lightbox
  const handlePhotoClick = useCallback((photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto'; // Restore scroll
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedPhoto) {
        closeLightbox();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedPhoto, closeLightbox]);

  // Calculate lightbox size for responsive fit with debouncing
  useEffect(() => {
    let timeoutId;
    const updateLightboxSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const padding = windowWidth <= 640 ? 16 : 32; // Responsive padding
        
        setLightboxSize({
          width: windowWidth - padding,
          height: windowHeight - padding
        });
      }, 100); // Debounce resize events
    };

    updateLightboxSize();
    window.addEventListener('resize', updateLightboxSize);
    return () => {
      window.removeEventListener('resize', updateLightboxSize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Optimized hero photo rotation with smoother transitions
  useEffect(() => {
    const heroPhotos = getPhotosByCategory('hero');
    if (heroPhotos.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setHeroPhotoIndex((prev) => (prev + 1) % heroPhotos.length);
        setIsTransitioning(false);
      }, 800); // Slower, smoother transition time
    }, 60000); // Increased to 60 seconds for better performance

    return () => clearInterval(interval);
  }, [getPhotosByCategory]);

  // Memoized loading component
  const LoadingSpinner = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your portfolio...</p>
      </div>
    </div>
  ), []);

  // Memoized error component
  const ErrorComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  ), [error]);

  // Memoized empty state component
  const EmptyStateComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">No photos found</h1>
        <p className="text-gray-400">Add some photos to get started!</p>
      </div>
    </div>
  ), []);

  if (loading) return LoadingSpinner;
  if (error) return ErrorComponent;
  if (photos.length === 0) return EmptyStateComponent;

  return (
    <div className="min-h-screen bg-black transition-colors duration-200 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex items-center justify-between h-20">
            {/* Name - Left */}
            <div className="flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-300">Noah Schifman</h2>
            </div>

            {/* Category Navigation - Center */}
            <div className="flex-1 flex justify-center items-center">
              <div className="flex items-center space-x-3 overflow-x-auto px-4">
                <Link
                  to="/"
                  className={`nav-button whitespace-nowrap ${!currentCategory ? 'nav-button-active' : 'nav-button-inactive'}`}
                >
                  All Photos
                </Link>
                
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/${cat}`}
                    className={`nav-button whitespace-nowrap ${currentCategory === cat ? 'nav-button-active' : 'nav-button-inactive'}`}
                  >
                    {cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Link>
                ))}
              </div>
            </div>

            {/* Instagram Link - Right */}
            <div className="flex-shrink-0 flex items-center space-x-3">
              <span className="text-gray-400/70 text-lg font-medium">Contact me!</span>
              <a
                href="https://instagram.com/nschify"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400/70 hover:text-white/90 transition-all duration-300 p-2 rounded-lg hover:bg-white/10"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 flex-1 page-transition">
        {/* Hero Section with Photo Backdrop */}
        {!currentCategory && (() => {
          const heroPhotos = getPhotosByCategory('hero');
          const currentHeroPhoto = heroPhotos[heroPhotoIndex];
          
          return (
            <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-12 2xl:-mx-16 mb-8 sm:mb-12">
              <div className="relative h-80 sm:h-96 lg:h-[28rem] xl:h-[32rem] overflow-hidden">
                {currentHeroPhoto && (
                  <picture>
                    {/* Mobile (up to 640px) */}
                    <source
                      media="(max-width: 640px)"
                      srcSet={currentHeroPhoto.mobilePreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
                    {/* Tablet (641px to 1024px) */}
                    <source
                      media="(min-width: 641px) and (max-width: 1024px)"
                      srcSet={currentHeroPhoto.tabletPreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
                    {/* Desktop (1025px and up) */}
                    <source
                      media="(min-width: 1025px)"
                      srcSet={currentHeroPhoto.desktopPreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
                    {/* Fallback */}
                    <img
                      src={currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                      alt={currentHeroPhoto.alt}
                      className={`absolute inset-0 w-full h-full object-cover hero-fade ${
                        isTransitioning ? 'opacity-50' : 'opacity-100'
                      }`}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                  </picture>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10"></div>
                <div className="relative z-20 flex items-center justify-center h-full px-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white/90 tracking-wide">Noah Schifman</h1>
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* Category Title */}
        {currentCategory && (
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-white mb-1">
              {currentCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </h2>
            <p className="text-gray-400 text-sm">
              {currentPhotos.length} photo{currentPhotos.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        {/* Photo Grid */}
        {currentPhotos.length > 0 ? (
          <div className="photo-grid">
            {currentPhotos.map((photo) => {
              const isVisible = visibleImages.has(photo.id);
              const isLoaded = loadedImages.has(photo.id);
              
              return (
                <div
                  key={photo.id}
                  className={`photo-item group ${isVisible ? 'visible' : ''}`}
                  data-photo-id={photo.id}
                  ref={(el) => {
                    if (el && observerRef.current) {
                      observerRef.current.observe(el);
                    }
                  }}
                  onClick={() => handlePhotoClick(photo)}
                >
                  {isVisible && (
                    <picture>
                      {/* Mobile (up to 640px) */}
                      <source
                        media="(max-width: 640px)"
                        srcSet={photo.mobilePreviewSrc || photo.previewSrc || photo.src}
                      />
                      {/* Tablet (641px to 1024px) */}
                      <source
                        media="(min-width: 641px) and (max-width: 1024px)"
                        srcSet={photo.tabletPreviewSrc || photo.previewSrc || photo.src}
                      />
                      {/* Desktop (1025px and up) */}
                      <source
                        media="(min-width: 1025px)"
                        srcSet={photo.desktopPreviewSrc || photo.previewSrc || photo.src}
                      />
                      {/* Fallback */}
                      <img
                        src={photo.previewSrc || photo.src}
                        alt={photo.alt}
                        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                          isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => handleImageLoad(photo.id)}
                        onContextMenu={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </picture>
                  )}
                
                  <div className="photo-overlay group-hover:bg-black/20">
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">No photos in this category yet.</p>
            {categories.length > 0 && (
              <Link 
                to="/" 
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline mt-2 inline-block"
              >
                View all photos
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8 mt-auto">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 text-center">
          <p className="text-gray-500 mb-4 text-sm">
            © {new Date().getFullYear()} Noah Schifman. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6">
            <a
              href="https://instagram.com/nschify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Responsive Lightbox */}
      {selectedPhoto && (
        <div className="lightbox" onClick={closeLightbox}>
          <img
            src={selectedPhoto.src}
            alt={selectedPhoto.alt}
            className="lightbox-image"
            style={{
              maxWidth: `${lightboxSize.width}px`,
              maxHeight: `${lightboxSize.height}px`
            }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default Gallery; 