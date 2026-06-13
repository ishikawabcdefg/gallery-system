import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GalleryApp from './gallery-inventory'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GalleryApp />
  </StrictMode>
)
