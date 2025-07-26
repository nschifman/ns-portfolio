import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ZoomIn } from 'lucide-react';
import { Photo } from '@/contexts/PhotoContext';

interface PhotoGalleryProps {
  photos: Photo[];
  columns?: number;
}

const PhotoGallery = ({ photos, columns = 3 }: PhotoGalleryProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedPhoto(null);
  };

  // Create masonry layout with proper image sizing
  const createMasonryLayout = () => {
    const columnArrays: Photo[][] = Array.from({ length: columns }, () => []);
    
    photos.forEach((photo, index) => {
      const columnIndex = index % columns;
      columnArrays[columnIndex].push(photo);
    });
    
    return columnArrays;
  };

  const masonryColumns = createMasonryLayout();

  return (
    <>
      {/* Masonry Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {masonryColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-4">
            {column.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg bg-muted cursor-pointer"
                onClick={() => openLightbox(photo)}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-auto max-h-96 object-cover"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] p-0 bg-black/95 border-0">
          {selectedPhoto && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* Image */}
              <img
                src={selectedPhoto.src}
                alt={selectedPhoto.alt}
                className="max-w-full max-h-full object-contain"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;