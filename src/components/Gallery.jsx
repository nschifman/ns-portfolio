import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';
import { generatePictureProps } from '../utils/imageOptimization';

const Gallery = () => {
  const { category } = useParams();
  const { photos, loading, error, categories, getPhotosByCategory, getAllPhotos } = usePhotos();
  
  // Get current photos based on category
  const currentPhotos = category ? getPhotosByCategory(category) : getAllPhotos();
  
  // Don't show hero photos in gallery
  const filteredPhotos = currentPhotos.filter(photo => photo.category !== 'hero');

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
  }, [lightboxOpen, selectedPhoto, filteredPhotos]);

  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  };

  const navigatePhoto = (direction) => {
    if (!selectedPhoto || !filteredPhotos.length) return;
    
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    const newIndex = (currentIndex + direction + filteredPhotos.length) % filteredPhotos.length;
    setSelectedPhoto(filteredPhotos[newIndex]);
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
                     <h2 className="text-2xl font-bold text-white mb-4 text-render-optimized">Error Loading Photos</h2>
           <p className="text-gray-400 mb-4 text-base">{error}</p>
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
  if (!loading && filteredPhotos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
                     <h2 className="text-2xl font-bold text-white mb-4 text-render-optimized">No Photos Found</h2>
           <p className="text-gray-400 mb-4 text-base">
             {category ? `No photos in the "${category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}" category.` : 'No photos available.'}
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
    <div className="bg-black">
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                         <p className="text-gray-400 text-base">Loading photos...</p>
          </div>
        </div>
      )}

             {/* Photo grid */}
       {!loading && filteredPhotos.length > 0 && (
         <div className="max-w-full mx-auto px-4 md:px-8 lg:px-12 py-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
             {filteredPhotos.map((photo) => {
               const galleryProps = generatePictureProps(photo.src, 'gallery');
               
               return (
                 <div
                   key={photo.id}
                   className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer"
                   onClick={() => openLightbox(photo)}
                 >
                   <picture>
                     <source
                       srcSet={galleryProps.srcset}
                       sizes={galleryProps.sizes}
                       type="image/webp"
                     />
                     <img
                       src={galleryProps.fallbackUrl}
                       alt={photo.alt || photo.title || 'Gallery photo'}
                       className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                       loading="lazy"
                       width={galleryProps.width}
                       height={galleryProps.height}
                     />
                   </picture>
                   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end">
                     <div className="p-4 w-full">
                       {/* Removed title display to avoid showing filenames */}
                     </div>
                   </div>
                 </div>
               );
             })}
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
             {(() => {
               const lightboxProps = generatePictureProps(selectedPhoto.src, 'lightbox');
               
               return (
                 <picture>
                   <source
                     srcSet={lightboxProps.srcset}
                     sizes={lightboxProps.sizes}
                     type="image/webp"
                   />
                   <img
                     src={lightboxProps.fallbackUrl}
                     alt={selectedPhoto.alt || selectedPhoto.title || 'Lightbox photo'}
                     className="max-w-[90vw] max-h-[90vh] object-contain"
                     style={{
                       maxWidth: 'min(90vw, 90vh * (16/9))',
                       maxHeight: 'min(90vh, 90vw * (9/16))'
                     }}
                     width={lightboxProps.width}
                     height={lightboxProps.height}
                   />
                 </picture>
               );
             })()}
            
            {/* Photo info */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
                           {/* Removed title display to avoid showing filenames */}
             {selectedPhoto.description && (
               <p className="text-gray-300 text-base">{selectedPhoto.description}</p>
             )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery; 