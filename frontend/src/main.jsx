import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";


// Tailwind + globals MUST be imported here so Vite includes them in dist
import "./index.css";


// If you still have extra global styles in content.css, keep this too.
// (Safe even if content.css is small.)
import "./content.css";


ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
<App />
</React.StrictMode>
);