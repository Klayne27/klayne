import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocketContextProvider } from "./context/SocketContext.jsx";
// import ScrollToTop from "./utils/ScrollToTop.js";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      {/* <ScrollToTop /> */}
      <QueryClientProvider client={queryClient}>
        <SocketContextProvider>
          <App />
        </SocketContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
