import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Performance optimization: Use requestIdleCallback for non-critical initialization
const initializeApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
};

// Use requestIdleCallback for better performance, with fallback
if ('requestIdleCallback' in window) {
  requestIdleCallback(initializeApp, { timeout: 1000 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(initializeApp, 0);
} 