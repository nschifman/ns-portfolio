import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

function Gallery() {
  const { category } = useParams();
  const { photos, categories, loading, error, getPhotosByCategory, getAllPhotos, refreshPhotos } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [lightboxSize, setLightboxSize] = useState({ width: 0, height: 0 });
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef(null);
  const loadedPhotosRef = useRef(new Set());
  const observerOptions = useMemo(() => ({
    rootMargin: '300px 0px', // Increased for better preloading
    threshold: 0.01 // Lower threshold for earlier detection
  }), []);

  // Check if mobile and if categories need dropdown
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current category name from URL
  const currentCategory = category || '';
  
  // Get photos for current category or all photos if no category
  const currentPhotos = useMemo(() => {
    return currentCategory ? getPhotosByCategory(currentCategory) : getAllPhotos();
  }, [currentCategory, getPhotosByCategory, getAllPhotos]);

  // Optimized Intersection Observer for lazy loading photos
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Photo is now visible and will load
          }
        });
      },
      observerOptions
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [observerOptions]);

  // Handle photo load completion
  const handlePhotoLoad = useCallback((photoId) => {
    loadedPhotosRef.current.add(photoId);
    // Force re-render only for this specific photo with better performance
    requestAnimationFrame(() => {
      const photoElement = document.querySelector(`[data-photo-id="${photoId}"] img`);
      if (photoElement) {
        photoElement.classList.add('photo-loaded');
      }
    });
  }, []);

  // Handle photo click for lightbox
  const handlePhotoClick = useCallback((photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden';
  }, []);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto';
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && selectedPhoto) {
        closeLightbox();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [selectedPhoto, closeLightbox]);

  // Calculate lightbox size for responsive fit
  useEffect(() => {
    const updateLightboxSize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const padding = windowWidth <= 640 ? 16 : 32;
      
      setLightboxSize({
        width: windowWidth - padding,
        height: windowHeight - padding
      });
    };

    updateLightboxSize();
    window.addEventListener('resize', updateLightboxSize);
    return () => window.removeEventListener('resize', updateLightboxSize);
  }, []);

  // Simple hero photo rotation
  useEffect(() => {
    const heroPhotos = getPhotosByCategory('hero');
    if (heroPhotos.length === 0) return;

    const interval = setInterval(() => {
      setHeroPhotoIndex((prev) => (prev + 1) % heroPhotos.length);
    }, 60000);

    return () => clearInterval(interval);
  }, [getPhotosByCategory]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  // Error component
  const ErrorComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
          <p className="text-gray-400 mb-6">{error}</p>
        </div>
        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Refresh Page
          </button>
          <button 
            onClick={refreshPhotos} 
            className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  ), [error]);

  // Empty state component
  const EmptyStateComponent = useMemo(() => (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <svg className="h-16 w-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-4">No photos found</h1>
          <p className="text-gray-400 mb-6">It looks like there are no photos available at the moment. Please check back later or contact me if you think this is an error.</p>
        </div>
        <button 
          onClick={refreshPhotos} 
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  ), [refreshPhotos]);

  // Show error or empty state immediately
  if (error) return ErrorComponent;
  if (photos.length === 0) return EmptyStateComponent;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="grid grid-cols-3 items-center h-20">
            {/* Home Button - Left */}
            <div className="flex justify-start">
              {isMobile ? (
                <Link
                  to="/"
                  className={`nav-button ${!currentCategory ? 'nav-button-active' : 'nav-button-inactive'}`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>
              ) : (
                <h2 className="text-lg font-semibold text-gray-300">Noah Schifman</h2>
              )}
            </div>

            {/* Category Navigation - Center */}
            <div className="flex justify-center">
              {isMobile ? (
                // Mobile navigation with dropdown
                <div className="relative mobile-menu-container">
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="nav-button-inactive flex items-center space-x-2 px-4 py-2 rounded-lg"
                    >
                      <span className="text-sm font-medium">Categories</span>
                      <svg className={`h-4 w-4 ${isMobileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Mobile dropdown overlay and menu */}
                  {isMobileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-56 bg-gray-900/98 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="py-2">
                          {categories.map((cat) => (
                            <Link
                              key={cat}
                              to={`/${cat}`}
                              className={`block px-4 py-3 text-sm font-medium ${
                                currentCategory === cat 
                                  ? 'bg-blue-500/90 text-white shadow-lg' 
                                  : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                              }`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // Desktop navigation
                <div className="flex items-center space-x-3 overflow-x-auto px-4">
                  <Link
                    to="/"
                    className={`nav-button whitespace-nowrap ${!currentCategory ? 'nav-button-active' : 'nav-button-inactive'}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
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
              )}
            </div>

            {/* Instagram Link - Right */}
            <div className="flex justify-end items-center">
              {isMobile ? (
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-gray-400/70 text-sm font-medium">Contact me!</span>
                  <a
                    href="https://instagram.com/nschify"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400/70 hover:text-white/90 p-2 rounded-lg hover:bg-white/10 flex items-center"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400/70 text-lg font-medium">Contact me!</span>
                  <svg className="h-4 w-4 text-gray-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <a
                    href="https://instagram.com/nschify"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400/70 hover:text-white/90 p-2 rounded-lg hover:bg-white/10 flex items-center"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 flex-1 min-h-[400px]">
        {/* Hero Section - Full Window Size */}
        {!currentCategory && (() => {
          const heroPhotos = getPhotosByCategory('hero');
          const currentHeroPhoto = heroPhotos[heroPhotoIndex];
          
          return (
            <div className="hero-container">
              <div className="relative h-screen w-full overflow-hidden">
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
                      className="hero-image"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                  </picture>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-10"></div>
                <div className="relative z-20 flex items-center justify-center h-full px-4">
                  <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white/90 tracking-wide mb-4">
                      Noah Schifman
                    </h1>
                    <p className="text-lg sm:text-xl lg:text-2xl text-white/80 font-light">
                      Photography
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* Gap between hero and photos */}
        {!currentCategory && <div className="h-16 sm:h-20 lg:h-24"></div>}
        
        {/* Category Title - Only show when photos are loaded */}
        {currentCategory && currentPhotos.length > 0 && (
          <div className="mb-6 category-title">
            <h2 className="text-2xl font-medium text-white mb-1">
              {currentCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </h2>
            <p className="text-gray-400 text-sm">
              {currentPhotos.length} photo{currentPhotos.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        
        {/* Photo Grid */}
        <div className="photo-grid">
          {currentPhotos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item group"
              data-photo-id={photo.id}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el);
                }
              }}
              onClick={() => handlePhotoClick(photo)}
            >
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
                  className="w-full h-full object-cover photo-fade-in"
                  loading="lazy"
                  decoding="async"
                  onLoad={() => handlePhotoLoad(photo.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </picture>
            
              <div className="photo-overlay group-hover:bg-black/20">
                <div className="opacity-0 group-hover:opacity-100">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
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
              className="text-gray-400 hover:text-white"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="lightbox" onClick={closeLightbox}>
          <picture>
            {/* Use highest quality image for lightbox */}
            <source
              srcSet={selectedPhoto.src}
              type="image/jpeg"
            />
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
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
          </picture>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
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