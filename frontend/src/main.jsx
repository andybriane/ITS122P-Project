import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';

// Import global CSS files in order
import './assets/css/variables.css';
import './assets/css/base.css';
import './assets/css/components.css';
import './assets/css/public.css';
import './assets/css/dashboard.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
