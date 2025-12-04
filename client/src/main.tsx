import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default browser error handling
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Desabilitar StrictMode temporariamente para evitar conexões WebSocket duplas
// Em produção o StrictMode não causa esse problema
const isDevelopment = import.meta.env.DEV;

ReactDOM.createRoot(document.getElementById("root")!).render(
  isDevelopment ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);