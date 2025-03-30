import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// Firebase imports
import { getApps, initializeApp } from 'firebase/app';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJLWF5dcnULM0OtQmu5o7udRn8eCVCl50",
  authDomain: "bus-tracker-e1fa3.firebaseapp.com",
  projectId: "bus-tracker-e1fa3",
  storageBucket: "bus-tracker-e1fa3.firebasestorage.app",
  messagingSenderId: "356974774625",
  appId: "1:356974774625:web:60a150d8de56b0ee70dd20"
};

// Initialize Firebase only if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
