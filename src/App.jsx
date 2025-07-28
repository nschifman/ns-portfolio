import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PhotoProvider } from './contexts/PhotoContext';
import Gallery from './components/Gallery';

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
      // Prevent Ctrl+S, Ctrl+U, F12, Ctrl+Shift+I, Ctrl+Shift+J
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))
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
        <Router basename="/test">
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/:category" element={<Gallery />} />
          </Routes>
        </Router>
      </PhotoProvider>
    </SecurityWrapper>
  );
}

export default App; 