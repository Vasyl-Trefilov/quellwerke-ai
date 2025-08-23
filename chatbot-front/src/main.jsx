import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AnimatedBlobs from "./AnimatedBlobs"
import { StrictMode } from 'react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div>
      <AnimatedBlobs />
      <App />
    </div>
  </StrictMode>
)
