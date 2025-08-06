import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-normal text-white mb-4 text-render-optimized">
          Error Not Found
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link 
          to="/" 
          className="inline-block px-6 py-3 bg-white text-black rounded-md hover:bg-gray-200 transition-colors font-normal"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 