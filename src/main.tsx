import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" toastOptions={{ style: { background: '#141416', color: '#fff', border: '1px solid #3f3f46', direction: 'rtl' } }} />
  </StrictMode>,
);
