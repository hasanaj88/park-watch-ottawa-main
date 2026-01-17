import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const MAINTENANCE_MODE = true;

function Maintenance() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "2rem",
      }}
    >
      🚧 Under Maintenance – Back Soon
    </div>
  );
}

function MainApp() {
  return (
    <div className="app-parking-bg">
      <div className="app-content">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </div>
    </div>
  );
}

export default function App() {
  return MAINTENANCE_MODE ? <Maintenance /> : <MainApp />;
}
