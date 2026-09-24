import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ErrorBoundary>
        <App />
        <Toaster richColors position="top-right" toastOptions={{ style: { fontFamily: 'inherit' } }} />
      </ErrorBoundary>
    </AuthProvider>
  </React.StrictMode>
);
