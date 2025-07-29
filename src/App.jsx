import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PhotoProvider } from './contexts/PhotoContext';

// Lazy load the Gallery component for better performance
const Gallery = lazy(() => import('./components/Gallery'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading your portfolio...</p>
    </div>
  </div>
);

// Security wrapper to prevent right-click, drag, and keyboard shortcuts
const SecurityWrapper = ({ children }) => {
  React.useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent right-click
    document.addEventListener('contextmenu', preventDefault);
    
    // Prevent drag and drop
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('drop', preventDefault);
    
    // Prevent keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Prevent Ctrl+S, Ctrl+U, F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        preventDefault(e);
      }
    });

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('drop', preventDefault);
    };
  }, []);

  return <div className="select-none">{children}</div>;
};

function App() {
  return (
    <SecurityWrapper>
      <PhotoProvider>
        <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Gallery />} />
              <Route path="/:category" element={<Gallery />} />
            </Routes>
          </Suspense>
        </Router>
      </PhotoProvider>
    </SecurityWrapper>
  );
}

export default App; 