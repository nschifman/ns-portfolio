import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Performance optimization: Use requestIdleCallback for non-critical initialization
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Use requestIdleCallback if available, otherwise render immediately
if ('requestIdleCallback' in window) {
  requestIdleCallback(renderApp, { timeout: 1000 })
} else {
  renderApp()
} 