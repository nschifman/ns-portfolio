import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PhotoProvider } from './contexts/PhotoContext';
import DynamicMeta from './components/DynamicMeta';

// Lazy load the Gallery component for better performance
const Gallery = lazy(() => import('./components/Gallery'));



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
                      <DynamicMeta />
                      <Suspense fallback={<div className="min-h-screen bg-black"></div>}>
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