import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AnimatedBlobs from "./AnimatedBlobs"

createRoot(document.getElementById('root')).render(
  <div>
    <AnimatedBlobs />
    <App />
  </div>,
)
