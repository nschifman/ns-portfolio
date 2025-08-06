import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';
import { useState, useEffect, useCallback, useMemo } from 'react';

function Gallery() {
  const { category } = useParams();
  const { photos, categories, loading, error, getPhotosByCategory, getAllPhotos, refreshPhotos } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  // Optimized mobile detection
  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  // Initialize mobile state
  useEffect(() => {
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkMobile]);

  // Get current category and photos
  const currentCategory = category || '';
  const currentPhotos = useMemo(() => {
    return currentCategory ? getPhotosByCategory(currentCategory) : getAllPhotos();
  }, [currentCategory, getPhotosByCategory, getAllPhotos]);

  // Mobile touch handlers
  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Swipe threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left - could be used for navigation
      } else {
        // Swipe right - could be used for navigation
      }
    }
    
    setTouchStart(null);
  }, [touchStart]);

  // Optimized photo click handler
  const handlePhotoClick = useCallback((photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden';
  }, []);

  // Optimized lightbox close
  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto';
  }, []);

  // Keyboard handler
  const handleKeydown = useCallback((e) => {
    if (e.key === 'Escape' && selectedPhoto) {
      closeLightbox();
    }
  }, [selectedPhoto, closeLightbox]);

  // Add/remove keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleKeydown]);

  // Mobile menu click outside handler
  const handleClickOutside = useCallback((event) => {
    if (isMobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Error component
  if (error) {
    return (
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
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
            >
              Refresh Page
            </button>
            <button 
              onClick={refreshPhotos} 
              className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (photos.length === 0) {
    return (
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
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Home */}
            <div className="flex items-center">
              <Link
                to="/"
                className="text-lg font-semibold text-gray-300 hover:text-white transition-colors"
              >
                Noah Schifman
              </Link>
            </div>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/"
                  className={`nav-button ${!currentCategory ? 'nav-button-active' : 'nav-button-inactive'}`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Link>
                
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/${cat}`}
                    className={`nav-button ${currentCategory === cat ? 'nav-button-active' : 'nav-button-inactive'}`}
                  >
                    {cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Navigation */}
            {isMobile && (
              <div className="flex items-center space-x-4">
                <div className="relative mobile-menu-container">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="nav-button-inactive flex items-center space-x-2 px-3 py-2 rounded-lg"
                    aria-label="Toggle categories menu"
                  >
                    <span className="text-sm font-medium">Categories</span>
                    <svg className={`h-4 w-4 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isMobileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsMobileMenuOpen(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900/98 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
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

                {/* Instagram Link */}
                <a
                  href="https://instagram.com/nschify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400/70 hover:text-white/90 p-2 rounded-lg hover:bg-white/10 flex items-center transition-colors"
                  aria-label="Follow on Instagram"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            )}

            {/* Desktop Instagram Link */}
            {!isMobile && (
              <div className="flex items-center space-x-3">
                <span className="text-gray-400/70 text-sm font-medium">Contact me!</span>
                <a
                  href="https://instagram.com/nschify"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400/70 hover:text-white/90 p-2 rounded-lg hover:bg-white/10 flex items-center transition-colors"
                  aria-label="Follow on Instagram"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        {!currentCategory && (() => {
          const heroPhotos = getPhotosByCategory('hero');
          const currentHeroPhoto = heroPhotos[0];
          
          return (
            <div className="hero-container">
              <div className="relative h-screen w-full overflow-hidden">
                {currentHeroPhoto && (
                  <picture>
                    <source
                      media="(max-width: 640px)"
                      srcSet={currentHeroPhoto.mobilePreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
                    <source
                      media="(min-width: 641px) and (max-width: 1024px)"
                      srcSet={currentHeroPhoto.tabletPreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
                    <source
                      media="(min-width: 1025px)"
                      srcSet={currentHeroPhoto.desktopPreviewSrc || currentHeroPhoto.previewSrc || currentHeroPhoto.src}
                    />
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
        
        {/* Photo Grid Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Category Title */}
          {currentCategory && currentPhotos.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-medium text-white mb-2">
                {currentCategory.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h2>
              <p className="text-gray-400 text-sm sm:text-base">
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
                onClick={() => handlePhotoClick(photo)}
                role="button"
                tabIndex={0}
                aria-label={`View ${photo.alt}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePhotoClick(photo);
                  }
                }}
              >
                <picture>
                  <source
                    media="(max-width: 640px)"
                    srcSet={photo.mobilePreviewSrc || photo.previewSrc || photo.src}
                  />
                  <source
                    media="(min-width: 641px) and (max-width: 1024px)"
                    srcSet={photo.tabletPreviewSrc || photo.previewSrc || photo.src}
                  />
                  <source
                    media="(min-width: 1025px)"
                    srcSet={photo.desktopPreviewSrc || photo.previewSrc || photo.src}
                  />
                  <img
                    src={photo.previewSrc || photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover photo-fade-in"
                    loading="lazy"
                    decoding="async"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </picture>
              
                <div className="photo-overlay group-hover:bg-black/20">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 mb-4 text-sm">
            © {new Date().getFullYear()} Noah Schifman. All rights reserved.
          </p>
          <div className="flex justify-center space-x-6">
            <a
              href="https://instagram.com/nschify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Follow on Instagram"
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
            <source
              srcSet={selectedPhoto.src}
              type="image/jpeg"
            />
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.alt}
              className="lightbox-image"
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
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label="Close lightbox"
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