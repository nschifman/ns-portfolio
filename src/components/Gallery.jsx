import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';

const Gallery = () => {
  const { category } = useParams();
  const { photos, loading, error, categories, getPhotosByCategory, getAllPhotos } = usePhotos();
  
  // Get current photos based on category
  const currentPhotos = category ? getPhotosByCategory(category) : getAllPhotos();

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Photos</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && currentPhotos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Photos Found</h2>
          <p className="text-gray-400 mb-4">
            {category ? `No photos in the "${category}" category.` : 'No photos available.'}
          </p>
          {category && (
            <Link 
              to="/" 
              className="text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to All Photos
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Link 
              to="/" 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              All Photos
            </Link>
            {categories.map(cat => (
              <Link
                key={cat}
                to={`/category/${cat}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading photos...</p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {!loading && currentPhotos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {currentPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer"
                onClick={() => openLightbox(photo)}
              >
                <img
                  src={photo.mobilePreviewSrc || photo.previewSrc || photo.src}
                  alt={photo.alt || photo.title || 'Photo'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
                  <div className="p-4 w-full">
                    <h3 className="text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {photo.title || photo.alt || 'Untitled'}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxOpen(false);
          }}
        >
          <div className="relative max-w-full max-h-full">
            {/* Close button */}
            <button
              className="absolute -top-12 right-0 text-white text-3xl hover:text-gray-300 z-10"
              onClick={() => setLightboxOpen(false)}
            >
              ×
            </button>
            
            {/* Navigation buttons */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 z-10"
              onClick={() => navigatePhoto(-1)}
            >
              ‹
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 z-10"
              onClick={() => navigatePhoto(1)}
            >
              ›
            </button>
            
            {/* Image */}
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.alt || selectedPhoto.title || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Photo info */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h3 className="text-xl font-semibold mb-2">
                {selectedPhoto.title || selectedPhoto.alt || 'Untitled'}
              </h3>
              {selectedPhoto.description && (
                <p className="text-gray-300">{selectedPhoto.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery; 