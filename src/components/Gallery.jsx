import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';

const Gallery = () => {
  const { category } = useParams();
  const { photos, loading, error, categories, getPhotosByCategory, getAllPhotos } = usePhotos();
  
  // Get photos for current category or all photos
  const currentPhotos = React.useMemo(() => {
    if (category) {
      return getPhotosByCategory(category);
    }
    return getAllPhotos();
  }, [category, getPhotosByCategory, getAllPhotos]);

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [selectedPhoto, setSelectedPhoto] = React.useState(null);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        navigatePhoto(-1);
      } else if (e.key === 'ArrowRight') {
        navigatePhoto(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, selectedPhoto, currentPhotos]);

  // Click outside to close lightbox
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (lightboxOpen && e.target.classList.contains('lightbox-overlay')) {
        setLightboxOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [lightboxOpen]);

  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  };

  const navigatePhoto = (direction) => {
    if (!selectedPhoto || !currentPhotos.length) return;
    
    const currentIndex = currentPhotos.findIndex(p => p.id === selectedPhoto.id);
    const newIndex = (currentIndex + direction + currentPhotos.length) % currentPhotos.length;
    setSelectedPhoto(currentPhotos[newIndex]);
  };

  // Error component
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Photos</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // Empty state component
  if (!loading && currentPhotos.length === 0) {
    return (
      <div className="empty-state">
        <h2>No Photos Found</h2>
        <p>{category ? `No photos in the "${category}" category.` : 'No photos available.'}</p>
        {category && (
          <Link to="/" className="back-link">← Back to All Photos</Link>
        )}
      </div>
    );
  }

  return (
    <div className="gallery-container">
      {/* Navigation */}
      <nav className="gallery-nav">
        <Link to="/" className={`nav-button ${!category ? 'active' : ''}`}>
          All Photos
        </Link>
        {categories.map(cat => (
          <Link 
            key={cat} 
            to={`/category/${cat}`} 
            className={`nav-button ${category === cat ? 'active' : ''}`}
          >
            {cat}
          </Link>
        ))}
      </nav>

      {/* Loading state */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading photos...</p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && currentPhotos.length > 0 && (
        <div className="photo-grid">
          {currentPhotos.map((photo) => (
            <div 
              key={photo.id} 
              className="photo-item"
              onClick={() => openLightbox(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openLightbox(photo);
                }
              }}
            >
              <picture>
                <source 
                  media="(min-width: 1024px)" 
                  srcSet={photo.desktopPreviewSrc || photo.src}
                />
                <source 
                  media="(min-width: 768px)" 
                  srcSet={photo.tabletPreviewSrc || photo.src}
                />
                <img
                  src={photo.mobilePreviewSrc || photo.src}
                  alt={photo.alt || photo.title || 'Photo'}
                  loading="lazy"
                  onTouchStart={() => {}}
                  onTouchEnd={() => {}}
                />
              </picture>
              <div className="photo-overlay">
                <h3>{photo.title || 'Untitled'}</h3>
                {photo.description && <p>{photo.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && selectedPhoto && (
        <div className="lightbox-overlay" role="dialog" aria-label="Photo lightbox">
          <div className="lightbox-content">
            <button 
              className="lightbox-close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              ×
            </button>
            <button 
              className="lightbox-nav prev"
              onClick={() => navigatePhoto(-1)}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button 
              className="lightbox-nav next"
              onClick={() => navigatePhoto(1)}
              aria-label="Next photo"
            >
              ›
            </button>
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.alt || selectedPhoto.title || 'Photo'}
              className="lightbox-image"
            />
            <div className="lightbox-info">
              <h3>{selectedPhoto.title || 'Untitled'}</h3>
              {selectedPhoto.description && <p>{selectedPhoto.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery; 