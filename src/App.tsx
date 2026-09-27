import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import RequireAuth from "./components/auth/RequireAuth";
import "leaflet/dist/leaflet.css";

const queryClient = new QueryClient();

const App = () => (
  <div className="app-parking-bg">
    <div className="app-content">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <Routes>
               <Route path="/" element={<Index />} />
               <Route path="/signup" element={<Signup />} />
               <Route path="/login" element={<Login />} />
               <Route path="/forgot-password" element={<ForgotPassword />} />
               <Route path="/reset-password" element={<ResetPassword />} />
               <Route
                      path="/account"
                      element={
               <RequireAuth>
               <Account />
               </RequireAuth>
                               }
                        />
              <Route path="*" element={<NotFound />} />
             </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  </div>
);

export default App;