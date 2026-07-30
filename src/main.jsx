import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider } from "./context/ToastContext";
import { NetworkProvider } from "./context/NetworkContext";

import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <ToastProvider>
                <NetworkProvider>
                    <App />
                </NetworkProvider>
            </ToastProvider>
        </BrowserRouter>
    </React.StrictMode>
);