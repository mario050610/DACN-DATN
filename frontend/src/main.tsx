import { ThemeProvider } from "./Theme"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { DemoStoreProvider } from './DemoStore'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider><DemoStoreProvider>
      <App />
    </DemoStoreProvider></ThemeProvider>
  </React.StrictMode>,
)
