import { useState } from 'react';
import { usePhotos } from '@/contexts/PhotoContext';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import PhotoGallery from '@/components/PhotoGallery';

const Index = () => {
  const { photos, categories } = usePhotos();
  const [activeCategory, setActiveCategory] = useState('all');

  // Get categories that have photos
  const categoriesWithPhotos = categories.filter(cat => {
    const categoryPhotos = photos.filter(photo => photo.category === cat.slug);
    return categoryPhotos.length > 0;
  });

  const getFilteredPhotos = () => {
    if (activeCategory === 'all') {
      return photos;
    }
    return photos.filter(photo => photo.category === activeCategory);
  };

  const getCategoryTitle = () => {
    if (activeCategory === 'all') return 'All Photos';
    const category = categories.find(cat => cat.slug === activeCategory);
    return category ? category.name : 'Category';
  };

  const filteredPhotos = getFilteredPhotos();
  const isViewingAll = activeCategory === 'all';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation
        categories={categoriesWithPhotos}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      
      {/* Only show hero when viewing all photos */}
      {isViewingAll && <Hero />}
      
      <main className={`max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 ${isViewingAll ? '' : 'pt-8'}`}>
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">
            {getCategoryTitle()}
          </h2>
          <p className="text-muted-foreground">
            {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>

        {filteredPhotos.length > 0 && (
          <PhotoGallery photos={filteredPhotos} columns={3} />
        )}
      </main>
    </div>
  );
};

export default Index;
