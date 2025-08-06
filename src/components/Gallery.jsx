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
    return React.createElement('div', { className: 'error-container' },
      React.createElement('h2', null, 'Error Loading Photos'),
      React.createElement('p', null, error),
      React.createElement('button', { onClick: () => window.location.reload() }, 'Try Again')
    );
  }

  // Empty state component
  if (!loading && currentPhotos.length === 0) {
    return React.createElement('div', { className: 'empty-state' },
      React.createElement('h2', null, 'No Photos Found'),
      React.createElement('p', null, category ? `No photos in the "${category}" category.` : 'No photos available.'),
      category && React.createElement(Link, { to: '/', className: 'back-link' }, '← Back to All Photos')
    );
  }

  return React.createElement('div', { className: 'gallery-container' },
    // Navigation
    React.createElement('nav', { className: 'gallery-nav' },
      React.createElement(Link, { 
        to: '/', 
        className: `nav-button ${!category ? 'active' : ''}` 
      }, 'All Photos'),
      ...categories.map(cat => 
        React.createElement(Link, {
          key: cat,
          to: `/category/${cat}`,
          className: `nav-button ${category === cat ? 'active' : ''}`
        }, cat)
      )
    ),

    // Loading state
    loading && React.createElement('div', { className: 'loading-container' },
      React.createElement('div', { className: 'loading-spinner' }),
      React.createElement('p', null, 'Loading photos...')
    ),

    // Photo grid
    !loading && currentPhotos.length > 0 && React.createElement('div', { className: 'photo-grid' },
      ...currentPhotos.map((photo) => 
        React.createElement('div', {
          key: photo.id,
          className: 'photo-item',
          onClick: () => openLightbox(photo),
          role: 'button',
          tabIndex: 0,
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openLightbox(photo);
            }
          }
        },
          React.createElement('picture', null,
            React.createElement('source', {
              media: '(min-width: 1024px)',
              srcSet: photo.desktopPreviewSrc || photo.src
            }),
            React.createElement('source', {
              media: '(min-width: 768px)',
              srcSet: photo.tabletPreviewSrc || photo.src
            }),
            React.createElement('img', {
              src: photo.mobilePreviewSrc || photo.src,
              alt: photo.alt || photo.title || 'Photo',
              loading: 'lazy',
              onTouchStart: () => {},
              onTouchEnd: () => {}
            })
          ),
          React.createElement('div', { className: 'photo-overlay' },
            React.createElement('h3', null, photo.title || 'Untitled'),
            photo.description && React.createElement('p', null, photo.description)
          )
        )
      )
    ),

    // Lightbox
    lightboxOpen && selectedPhoto && React.createElement('div', {
      className: 'lightbox-overlay',
      role: 'dialog',
      'aria-label': 'Photo lightbox'
    },
      React.createElement('div', { className: 'lightbox-content' },
        React.createElement('button', {
          className: 'lightbox-close',
          onClick: () => setLightboxOpen(false),
          'aria-label': 'Close lightbox'
        }, '×'),
        React.createElement('button', {
          className: 'lightbox-nav prev',
          onClick: () => navigatePhoto(-1),
          'aria-label': 'Previous photo'
        }, '‹'),
        React.createElement('button', {
          className: 'lightbox-nav next',
          onClick: () => navigatePhoto(1),
          'aria-label': 'Next photo'
        }, '›'),
        React.createElement('img', {
          src: selectedPhoto.src,
          alt: selectedPhoto.alt || selectedPhoto.title || 'Photo',
          className: 'lightbox-image'
        }),
        React.createElement('div', { className: 'lightbox-info' },
          React.createElement('h3', null, selectedPhoto.title || 'Untitled'),
          selectedPhoto.description && React.createElement('p', null, selectedPhoto.description)
        )
      )
    )
  );
};

export default Gallery; 