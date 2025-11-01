import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Tailwind (if you enabled it) stays in index.css; our custom tweaks go in content.css
import './index.css'
import './content.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
