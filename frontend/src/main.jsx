import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.jsx"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SocketContextProvider } from "./context/SocketContext.jsx"
import { ThemeProvider } from "./context/ThemeContext.jsx"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools" // Import devtools

const queryClient = new QueryClient()

// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/sw.js").then(
//       (registration) => {
//         console.log("Service Worker registration successful with scope: ", registration.scope)
//       },
//       (err) => {
//         console.log("Service Worker registration failed: ", err)
//       },
//     )
//   })
// }


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SocketContextProvider>
          <ThemeProvider>
            <App />

            {/* <ReactQueryDevtools initialIsOpen={false} />  */}
          </ThemeProvider>
        </SocketContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
