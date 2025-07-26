import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import { Category } from '@/contexts/PhotoContext';

interface NavigationProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const Navigation = ({ categories, activeCategory, onCategoryChange }: NavigationProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-background/60 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="text-lg font-bold"
              onClick={() => onCategoryChange('all')}
            >
              Noah Schifman
            </Button>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'ghost'}
              onClick={() => onCategoryChange('all')}
            >
              All Photos
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.slug}
                variant={activeCategory === category.slug ? 'default' : 'ghost'}
                onClick={() => onCategoryChange(category.slug)}
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

        {/* Mobile Navigation */}
        <div className="md:hidden py-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange('all')}
            >
              All Photos
            </Button>
            
            {categories.map((category) => (
              <Button
                key={category.slug}
                variant={activeCategory === category.slug ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;