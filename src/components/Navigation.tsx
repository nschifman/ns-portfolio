import { Button } from '@/components/ui/button';
import { usePhotos } from '@/contexts/PhotoContext';
import { Instagram } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Navigation = () => {
  const { categories } = usePhotos();
  const location = useLocation();
  const navigate = useNavigate();

  const handleCategoryClick = (categorySlug: string) => {
    if (categorySlug === 'all') {
      navigate('/');
    } else {
      navigate(`/${categorySlug}`);
    }
  };

  const getActiveCategory = () => {
    const path = location.pathname;
    if (path === '/') {
      return 'all';
    }
    return path.substring(1);
  };

  const activeCategory = getActiveCategory();

  return (
    <nav className="sticky top-0 z-50 bg-background/60 backdrop-blur-md border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Category Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleCategoryClick('all')}
              className="text-sm font-medium"
            >
              All Photos
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.slug ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleCategoryClick(category.slug)}
                className="text-sm font-medium"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Instagram Link */}
          <div className="flex items-center">
            <a
              href="https://instagram.com/nschify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;