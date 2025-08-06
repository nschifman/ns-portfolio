import React, { useState, useEffect } from 'react';
import { usePhotos } from '../contexts/PhotoContext';

const Hero = () => {
  const { photos } = usePhotos();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get hero photos
  const heroPhotos = photos.filter(photo => photo.category === 'hero');
  
  useEffect(() => {
    if (heroPhotos.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroPhotos.length
      );
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [heroPhotos.length]);
  
  if (heroPhotos.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4">
            Noah Schifman
          </h1>
          <p className="text-xl md:text-2xl text-gray-400">
            Photographer & Creative
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden">
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
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 drop-shadow-lg">
            Noah Schifman
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 drop-shadow-lg">
            Photographer & Creative
          </p>
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
    </div>
  );
};

export default Hero; 