import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FlowProviderWrapper } from './components/FlowProviderWrapper.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlowProviderWrapper>
      <App />
    </FlowProviderWrapper>
  </StrictMode>,
)
