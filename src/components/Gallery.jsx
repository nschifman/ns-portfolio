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
  const [preloadedFullSize, setPreloadedFullSize] = useState(new Set());
  const [isCategoryTransitioning, setIsCategoryTransitioning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSiteFullyLoaded, setIsSiteFullyLoaded] = useState(false);
  const observerRef = useRef(null);
  const observerOptions = useMemo(() => ({
    rootMargin: '100px 0px', // Increased for better performance
    threshold: 0.1
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

  // Mark site as fully loaded after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSiteFullyLoaded(true);
    }, 1000); // Wait 1 second after initial load
    
    return () => clearTimeout(timer);
  }, []);

  // Background preloader for visible full-size images
  useEffect(() => {
    if (!isSiteFullyLoaded || currentPhotos.length === 0) return;

    const preloadVisibleFullSize = async () => {
      const visiblePhotoIds = Array.from(visibleImages);
      const photosToPreload = currentPhotos.filter(photo => 
        visiblePhotoIds.includes(photo.id) && !preloadedFullSize.has(photo.id)
      );

      // Preload full-size images for visible photos
      for (const photo of photosToPreload) {
        try {
          const img = new Image();
          img.src = photo.src;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          setPreloadedFullSize(prev => new Set(prev).add(photo.id));
        } catch (error) {
          console.warn('Failed to preload full-size image:', photo.id);
        }
      }
    };

    preloadVisibleFullSize();
  }, [isSiteFullyLoaded, visibleImages, currentPhotos, preloadedFullSize]);

  // Get current category name from URL
  const currentCategory = category || '';
  
  // Get photos for current category or all photos if no category
  const currentPhotos = useMemo(() => {
    return currentCategory ? getPhotosByCategory(currentCategory) : getAllPhotos();
  }, [currentCategory, getPhotosByCategory, getAllPhotos]);

  // Handle category transitions smoothly
  useEffect(() => {
    setIsMobileMenuOpen(false); // Close mobile menu on category change
    // Only fade out the old content, don't fade in the new content
    setIsCategoryTransitioning(true);
    const timer = setTimeout(() => {
      setIsCategoryTransitioning(false);
    }, 400); // Longer duration for smoother transition
    
    return () => clearTimeout(timer);
  }, [currentCategory]);

  // Preload first few images for better initial load experience
  useEffect(() => {
    if (currentPhotos.length > 0 && visibleImages.size === 0) {
      const initialImages = new Set();
      // Preload first 6 images immediately
      const imagesToPreload = Math.min(6, currentPhotos.length);
      for (let i = 0; i < imagesToPreload; i++) {
        initialImages.add(currentPhotos[i].id);
      }
      setVisibleImages(initialImages);
    }
  }, [currentPhotos, visibleImages.size]);

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
              
              // Preload nearby images for smoother scrolling
              const currentIndex = currentPhotos.findIndex(p => p.id === photoId);
              if (currentIndex !== -1) {
                // Preload next 2 images
                for (let i = 1; i <= 2; i++) {
                  const nextPhoto = currentPhotos[currentIndex + i];
                  if (nextPhoto && !newVisibleImages.has(nextPhoto.id)) {
                    newVisibleImages.add(nextPhoto.id);
                  }
                }
                // Preload previous 1 image
                const prevPhoto = currentPhotos[currentIndex - 1];
                if (prevPhoto && !newVisibleImages.has(prevPhoto.id)) {
                  newVisibleImages.add(prevPhoto.id);
                }
              }
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
  }, [observerOptions, visibleImages, currentPhotos]);

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
      setHeroPhotoIndex((prev) => (prev + 1) % heroPhotos.length);
    }, 60000); // 60 seconds for better performance

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

  // Debug logging
  console.log('Gallery state:', { loading, error, photosLength: photos.length, currentCategory });
  
  // Temporary fallback for debugging
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">Loading photos...</div>
        <div className="text-gray-400 text-sm">Please wait while we load your portfolio</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">Error: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">No photos found</div>
        <div className="text-gray-400 text-sm">Add some photos to get started!</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black transition-colors duration-200 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
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
                    {/* Dropdown button */}
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="nav-button-inactive flex items-center space-x-2 px-4 py-2 rounded-lg"
                    >
                      <span className="text-sm font-medium">Categories</span>
                      <svg className={`h-4 w-4 transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Background overlay when dropdown is open */}
                  {isMobileMenuOpen && (
                    <div 
                      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  )}
                  
                  {/* Dropdown menu */}
                  {isMobileMenuOpen && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 w-56 bg-gray-900/98 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="py-2">
                        {categories.map((cat) => (
                          <Link
                            key={cat}
                            to={`/${cat}`}
                            className={`block px-4 py-3 text-sm font-medium transition-all duration-200 ${
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
                    className="text-gray-400/70 hover:text-white/90 transition-all duration-300 p-2 rounded-lg hover:bg-white/10 flex items-center"
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
                    className="text-gray-400/70 hover:text-white/90 transition-all duration-300 p-2 rounded-lg hover:bg-white/10 flex items-center"
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
      <main className={`max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 flex-1 min-h-[400px] ${
        isCategoryTransitioning ? 'category-slide-enter' : ''
      }`}>
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
                                          className="absolute inset-0 w-full h-full object-cover hero-fade"
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
          <div className={`mb-6 transition-all duration-500 ease-in-out ${
            isCategoryTransitioning ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
          }`}>
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
          <div className={`photo-grid transition-all duration-500 ease-in-out ${
            isCategoryTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'
          }`}>
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
                        className={`w-full h-full object-cover group-hover:scale-102 ${
                          isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="high"
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