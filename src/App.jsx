import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PhotoProvider } from './contexts/PhotoContext';
import Gallery from './components/Gallery';

function App() {
  return (
    <PhotoProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/category/:category" element={<Gallery />} />
        </Routes>
      </Router>
    </PhotoProvider>
  );
}

export default App;