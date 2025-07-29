import { useEffect } from 'react';

const DynamicMeta = () => {
  useEffect(() => {
    const updateMetaTags = async () => {
      try {
        const response = await fetch('/api/meta');
        if (!response.ok) return;
        
        const metaData = await response.json();
        
        // Update title
        document.title = "Noah Schifman Photography";
        
        // Update meta description
        const descriptionMeta = document.querySelector('meta[name="description"]');
        if (descriptionMeta && metaData.description) {
          descriptionMeta.setAttribute('content', metaData.description);
        }
        
        // Update keywords
        const keywordsMeta = document.querySelector('meta[name="keywords"]');
        if (keywordsMeta && metaData.keywords) {
          keywordsMeta.setAttribute('content', metaData.keywords);
        }
        
        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && metaData.title) {
          ogTitle.setAttribute('content', metaData.title);
        }
        
        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription && metaData.description) {
          ogDescription.setAttribute('content', metaData.description);
        }
        
        // Update Twitter tags
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle && metaData.title) {
          twitterTitle.setAttribute('content', metaData.title);
        }
        
        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescription && metaData.description) {
          twitterDescription.setAttribute('content', metaData.description);
        }
        
        // Update structured data
        const structuredDataScript = document.querySelector('script[type="application/ld+json"]');
        if (structuredDataScript && metaData.categories) {
          const structuredData = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Noah Schifman",
            "alternateName": "nschify",
            "jobTitle": "Professional Photographer",
            "url": "https://noahschifman.com",
            "sameAs": [
              "https://instagram.com/nschify"
            ],
            "description": metaData.description,
            "image": "https://photos.noahschifman.com/hero/DSCF6701-Pano.jpg",
            "knowsAbout": [
              "Photography",
              ...metaData.categories.map(cat => `${cat.charAt(0).toUpperCase() + cat.slice(1)} Photography`)
            ]
          };
          
          structuredDataScript.textContent = JSON.stringify(structuredData);
        }
        
      } catch (error) {
        console.error('Error updating meta tags:', error);
      }
    };

    // Update meta tags on component mount
    updateMetaTags();
    
    // Set up interval to update meta tags every 5 minutes
    const interval = setInterval(updateMetaTags, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

export default DynamicMeta; 