// Replace these TWO files exactly as below.
// 1) frontend/src/main.jsx
// 2) frontend/index.html
// This ensures Tailwind/CSS is bundled by Vite for production.


/* =====================
frontend/src/main.jsx
===================== */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";


// IMPORTANT: import your Tailwind / global CSS here so Vite includes it in dist
import "./content.css"; // (if your global file is named differently, rename this import)


ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>
<App />
</React.StrictMode>
);