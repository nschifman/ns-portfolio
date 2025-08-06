import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePhotos } from '../contexts/PhotoContext';
import { generatePictureProps } from '../utils/imageOptimization';

const Hero = () => {
  const { photos, loading, categories } = usePhotos();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get hero photos - use first 3 photos from any category
  const heroPhotos = photos.slice(0, 3);
  
  // Get category previews (most recent photo from each category, excluding hero)
  const getCategoryPreviews = () => {
    const previews = [];
    categories.forEach(category => {
      // Skip hero category
      if (category.toLowerCase() === 'hero') return;
      
      const categoryPhotos = photos.filter(photo => photo.category === category);
      if (categoryPhotos.length > 0) {
        // Get the most recent photo (first in the array since they're sorted by upload date)
        previews.push({
          category,
          photo: categoryPhotos[0]
        });
      }
    });
    return previews;
  };
  
  const categoryPreviews = getCategoryPreviews();
  
  useEffect(() => {
    if (heroPhotos.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroPhotos.length
      );
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [heroPhotos.length]);
  
  return (
    <div className="bg-black">
      {/* Hero Section */}
      <div className="h-[60vh] relative overflow-hidden">
        {heroPhotos.length === 0 ? (
          // Fallback when no hero photos
          <div className="h-full bg-black flex items-center justify-center">
            <div className="text-center">
                               <h1 className="text-3xl md:text-4xl lg:text-5xl font-extralight text-white mb-2 text-render-optimized">
                   Noah Schifman
                 </h1>
            </div>
          </div>
        ) : (
          <>
                         {/* Background images with fade transition */}
             {heroPhotos.map((photo, index) => {
               const heroProps = generatePictureProps(photo.src, 'hero');
               
               return (
                 <div
                   key={photo.id}
                   className={`absolute inset-0 transition-opacity duration-1000 ${
                     index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                   }`}
                 >
                   <picture>
                     <source
                       srcSet={heroProps.srcset}
                       sizes={heroProps.sizes}
                       type="image/webp"
                     />
                     <img
                       src={heroProps.fallbackUrl}
                       alt={photo.alt || `Hero image ${index + 1}`}
                       className="w-full h-full object-cover"
                       fetchPriority={index === 0 ? "high" : "auto"}
                       loading={index === 0 ? "eager" : "lazy"}
                       width={heroProps.width}
                       height={heroProps.height}
                     />
                   </picture>
                   <div className="absolute inset-0 bg-black/40"></div>
                 </div>
               );
             })}
            
            {/* Content overlay */}
            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="text-center">
                                 <h1 className="text-3xl md:text-4xl lg:text-5xl font-extralight text-white mb-2 drop-shadow-lg text-render-optimized">
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
      
             {/* Category Previews Section */}
       {!loading && categoryPreviews.length > 0 && (
         <div className="max-w-full mx-auto px-4 md:px-8 lg:px-12 py-12">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                          {categoryPreviews.map(({ category, photo }) => {
               const categoryProps = generatePictureProps(photo.src, 'category');
               
               return (
                 <Link
                   key={category}
                   to={`/category/${category}`}
                   className="group relative aspect-[4/3] overflow-hidden rounded-lg cursor-pointer block"
                 >
                   <picture>
                     <source
                       srcSet={categoryProps.srcset}
                       sizes={categoryProps.sizes}
                       type="image/webp"
                     />
                     <img
                       src={categoryProps.fallbackUrl}
                       alt={photo.alt || photo.title || `${category} category preview`}
                       className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                       loading="lazy"
                       width={categoryProps.width}
                       height={categoryProps.height}
                     />
                   </picture>
                   {/* Overlay with opacity/grey effect */}
                   <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-300"></div>
                   
                   {/* Category name */}
                   <div className="absolute inset-0 flex items-center justify-center">
                                           <h2 className="text-xl md:text-2xl lg:text-3xl font-light text-white drop-shadow-lg text-center px-4 text-render-optimized">
                        {category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}
                      </h2>
                   </div>
                 </Link>
               );
             })}
           </div>
         </div>
       )}
    </div>
  );
};

export default Hero; 