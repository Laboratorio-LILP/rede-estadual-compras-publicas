import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./estilos/tokens.css";
import "./estilos/base.css";

const raiz = document.getElementById("raiz");
if (!raiz) {
  throw new Error("O elemento #raiz nao existe no index.html.");
}

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
