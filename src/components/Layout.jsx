import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  
  // Check if we're on a subcategory page
  const isSubcategoryPage = location.pathname.startsWith('/category/');
  const categoryName = isSubcategoryPage ? location.pathname.split('/')[2] : null;
  
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Navigation - Hidden on subcategory pages on desktop, always visible on mobile */}
      <nav className={`sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-gray-800 ${isSubcategoryPage ? 'md:hidden' : ''}`}>
                 <div className="max-w-full mx-auto px-4 md:px-8 lg:px-12 py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Home button */}
            <div className="flex items-center">
              <Link 
                to="/" 
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                title="Home"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </Link>
            </div>
            
            {/* Center - Noah Schifman (mobile only) */}
            <div className="md:hidden">
              <h1 className="text-lg font-light text-white">Noah Schifman</h1>
            </div>
            
            {/* Right side - Instagram */}
            <div className="flex items-center">
              <a 
                href="https://instagram.com/nschify" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                title="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Category Title (desktop only, on subcategory pages) */}
      {isSubcategoryPage && (
        <div className="hidden md:block border-b border-gray-800 py-6">
          <div className="max-w-full mx-auto px-4 md:px-8 lg:px-12">
            <div className="flex items-center justify-between">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to Home</span>
              </Link>
              <h1 className="text-2xl font-light text-white text-center">
                {categoryName ? categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase() : 'Category'}
              </h1>
              <div className="w-32"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-4">
                 <div className="max-w-full mx-auto px-4 md:px-8 lg:px-12 text-center">
                           <p className="text-gray-400 text-base text-render-optimized">
                   © {currentYear} Noah Schifman. All rights reserved.
                 </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 