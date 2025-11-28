import React from "react";
import ReactDOM from "react-dom/client";

// Render the whole app (App includes the header + big stage at the top)
import App from "./App.jsx";

// Load your global CSS so any custom styles still apply
import "./index.css";
import "./content.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
