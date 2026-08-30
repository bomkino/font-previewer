import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "@pitchdog/type-system/fonts.css";
import "@pitchdog/type-system/typography.css";
import "@pitchdog/type-system/ui.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
