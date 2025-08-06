import React, { useState, useEffect } from 'react';
import { usePhotos } from '../contexts/PhotoContext';

const Hero = () => {
  const { photos, loading } = usePhotos();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroLoaded, setHeroLoaded] = useState(false);
  
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Get hero photos
  const heroPhotos = photos.filter(photo => photo.category === 'hero');
  
  // Get all non-hero photos for the gallery below
  const galleryPhotos = photos.filter(photo => photo.category !== 'hero');
  
  useEffect(() => {
    if (heroPhotos.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroPhotos.length
      );
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [heroPhotos.length]);
  
  // Mark hero as loaded after a short delay to ensure smooth transition
  useEffect(() => {
    if (!loading && heroPhotos.length > 0) {
      const timer = setTimeout(() => setHeroLoaded(true), 500);
      return () => clearTimeout(timer);
    }
  }, [loading, heroPhotos.length]);
  
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
  }, [lightboxOpen, selectedPhoto, galleryPhotos]);

  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  };

  const navigatePhoto = (direction) => {
    if (!selectedPhoto || !galleryPhotos.length) return;
    
    const currentIndex = galleryPhotos.findIndex(p => p.id === selectedPhoto.id);
    const newIndex = (currentIndex + direction + galleryPhotos.length) % galleryPhotos.length;
    setSelectedPhoto(galleryPhotos[newIndex]);
  };
  
  return (
    <div className="bg-black">
             {/* Hero Section */}
       <div className="h-[60vh] relative overflow-hidden">
        {heroPhotos.length === 0 ? (
                     // Fallback when no hero photos
           <div className="min-h-screen bg-black flex items-center justify-center">
             <div className="text-center">
               <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
                 Noah Schifman
               </h1>
             </div>
           </div>
        ) : (
          <>
            {/* Background images with fade transition */}
            {heroPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>
              </div>
            ))}
            
                         {/* Content overlay */}
             <div className="relative z-10 min-h-screen flex items-center justify-center">
               <div className="text-center">
                 <h1 className="text-3xl md:text-4xl font-light text-white mb-2 drop-shadow-lg">
                   Noah Schifman
                 </h1>
               </div>
             </div>
            
            {/* Image counter */}
            {heroPhotos.length > 1 && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
                <div className="flex space-x-2">
                  {heroPhotos.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Gallery Section - Load after hero */}
      {heroLoaded && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {galleryPhotos.map((photo) => (
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
    </div>
  );
};

export default Hero; 