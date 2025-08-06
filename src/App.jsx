import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PhotoProvider } from './contexts/PhotoContext';
import Layout from './components/Layout';
import Hero from './components/Hero';
import Gallery from './components/Gallery';

function App() {
  return (
    <PhotoProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/category/:category" element={<Gallery />} />
          </Routes>
        </Layout>
      </Router>
    </PhotoProvider>
  );
}

export default App;