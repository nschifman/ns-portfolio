import { useState, useCallback } from 'react';
import { ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Photo } from '@/contexts/PhotoContext';

interface PhotoGalleryProps {
  photos: Photo[];
  columns?: number;
}

// Security: Validate photo object
const isValidPhoto = (photo: any): photo is Photo => {
  return (
    photo &&
    typeof photo === 'object' &&
    typeof photo.id === 'string' &&
    typeof photo.src === 'string' &&
    typeof photo.alt === 'string' &&
    typeof photo.category === 'string' &&
    typeof photo.filename === 'string' &&
    photo.src.startsWith('/photos/') &&
    /\.(jpg|jpeg|png|gif|webp)$/i.test(photo.src)
  );
};

const PhotoGallery = ({ photos, columns = 3 }: PhotoGalleryProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = useCallback((photo: Photo) => {
    if (isValidPhoto(photo)) {
      setSelectedPhoto(photo);
      setIsLightboxOpen(true);
    }
  }, []);

  // Create masonry layout with proper image sizing
  const createMasonryLayout = useCallback(() => {
    const validPhotos = photos.filter(isValidPhoto);
    const columnArrays: Photo[][] = Array.from({ length: columns }, () => []);
    
    validPhotos.forEach((photo, index) => {
      const columnIndex = index % columns;
      columnArrays[columnIndex].push(photo);
    });
    
    return columnArrays;
  }, [photos, columns]);

  const masonryColumns = createMasonryLayout();

  // Security: Handle image load errors
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', e.currentTarget.src);
    e.currentTarget.style.display = 'none';
  }, []);

  return (
    <>
      {/* Masonry Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {masonryColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-4">
            {column.map((photo, photoIndex) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-lg bg-muted cursor-pointer transition-all duration-500 ease-in-out transform hover:scale-[1.02]"
                style={{
                  animationDelay: `${photoIndex * 50}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
                onClick={() => openLightbox(photo)}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onError={handleImageError}
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modern Responsive Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 bg-black/95 border-0 rounded-none">
          {selectedPhoto && isValidPhoto(selectedPhoto) && (
            <div className="w-full h-full grid place-items-center relative">
              {/* Image container using modern responsive approach */}
              <div className="w-full h-full flex items-center justify-center p-4">
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedPhoto.src}
                    alt={selectedPhoto.alt}
                    className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] w-auto h-auto object-contain transition-all duration-300 ease-in-out"
                    style={{
                      maxWidth: 'min(calc(100vw - 2rem), calc(100vh - 2rem) * 16/9)',
                      maxHeight: 'min(calc(100vh - 2rem), calc(100vw - 2rem) * 9/16)'
                    }}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onError={handleImageError}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;