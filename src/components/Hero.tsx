import { Instagram, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

const Hero = () => {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [heroImages, setHeroImages] = useState<string[]>([]);

  // Load hero images from manifest
  useEffect(() => {
    const loadHeroImages = async () => {
      try {
        const response = await fetch('/photos/hero-manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          setHeroImages(manifest.heroImages || []);
        } else {
          // Fallback to single hero image
          setHeroImages(['/photos/hero-background.jpg']);
        }
      } catch (error) {
        // Fallback to single hero image
        setHeroImages(['/photos/hero-background.jpg']);
      }
    };

    loadHeroImages();
  }, []);

  // Rotate hero images every 20 seconds
  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [heroImages.length]);

  const currentHeroImage = heroImages[currentHeroIndex] || '/photos/hero-background.jpg';

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 transition-all duration-2000 ease-in-out"
        style={{backgroundImage: `url(${currentHeroImage})`}}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:p-8">
        <div className="animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <Camera className="h-12 w-12 text-accent mr-4" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground drop-shadow-lg">
              Noah Schifman
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up">
            <a
              href="https://instagram.com/nschify"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="group bg-background/80 backdrop-blur-sm">
                <Instagram className="h-5 w-5 mr-2 group-hover:text-accent transition-colors" />
                Follow @nschify
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Hero image indicators */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {heroImages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ease-in-out ${
                index === currentHeroIndex ? 'bg-white scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;