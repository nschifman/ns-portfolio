import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PhotoProvider } from "@/contexts/PhotoContext";
import Index from "./components/Index";
import { useEffect, Component, ReactNode } from "react";

// Error Boundary Component
class ErrorBoundaryClass extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-xl text-gray-600 mb-4">Please refresh the page</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global security component
function SecurityWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Security: Prevent right-click context menu globally
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Security: Prevent drag and drop globally
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Security: Prevent keyboard shortcuts for saving and developer tools
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'S')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 's' || e.key === 'S')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'F5') ||
        (e.ctrlKey && e.key === 'R')
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Security: Prevent text selection on images
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    };

    // Security: Prevent copy operations
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Security: Prevent cut operations
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);

    // Security: Add CSS to prevent text selection and interactions
    const style = document.createElement('style');
    style.textContent = `
      img {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        user-drag: none;
        pointer-events: none;
      }
      
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      /* Allow text selection on specific elements */
      input, textarea, [contenteditable] {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        pointer-events: auto;
      }

      /* Prevent iframe embedding */
      iframe {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Security: Disable console in production
    if (import.meta.env.PROD) {
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
    }

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundaryClass>
    <SecurityWrapper>
      <PhotoProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/:category" element={<Index />} />
            <Route path="*" element={<div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
                <a href="/" className="text-blue-500 hover:text-blue-700 underline">
                  Return to Home
                </a>
              </div>
            </div>} />
          </Routes>
        </BrowserRouter>
      </PhotoProvider>
    </SecurityWrapper>
  </ErrorBoundaryClass>
);

export default App;
