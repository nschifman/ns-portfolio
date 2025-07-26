import { usePhotos } from '@/contexts/PhotoContext';
import { useLocation, useParams } from 'react-router-dom';
import Hero from '@/components/Hero';
import Navigation from '@/components/Navigation';
import PhotoGallery from '@/components/PhotoGallery';

const Index = () => {
  const { photos, getPhotosByCategory } = usePhotos();
  const location = useLocation();
  const params = useParams();

  // Determine if we're viewing all photos or a specific category
  const isViewingAll = location.pathname === '/';
  
  // Get the active category from the URL params or pathname
  const activeCategory = isViewingAll ? 'all' : (params.category || location.pathname.substring(1));
  
  // Get filtered photos based on category
  const getFilteredPhotos = () => {
    if (activeCategory === 'all') {
      return photos;
    }
    return getPhotosByCategory(activeCategory);
  };

  const filteredPhotos = getFilteredPhotos();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className={`transition-all duration-500 ease-in-out ${isViewingAll ? '' : 'pt-8'}`}>
        <div className={`transition-all duration-700 ease-in-out ${isViewingAll ? 'opacity-100 max-h-screen' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          {isViewingAll && <Hero />}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="transition-all duration-500 ease-in-out">
            <PhotoGallery photos={filteredPhotos} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index; 