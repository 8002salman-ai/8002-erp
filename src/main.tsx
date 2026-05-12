import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Theme is still safe to keep locally for UX (not accounting data).
try {
  const savedUI = localStorage.getItem('8002-ui') || localStorage.getItem('embani-ui');
  if (savedUI) {
    const { state } = JSON.parse(savedUI);
    if (state?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
