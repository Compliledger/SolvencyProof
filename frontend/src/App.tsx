import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Product from "./pages/Product";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";
import Login from "./pages/app/Login";

// Verifier Pages (Protected - Auth Required)
import Dashboard from "./pages/app/Dashboard";
import ReportsList from "./pages/app/ReportsList";
import ReportDetail from "./pages/app/ReportDetail";
import InclusionCheck from "./pages/app/InclusionCheck";

// Operator Flow Pages (Protected - Auth Required)
import YellowSessions from "./pages/app/YellowSessions";
import Liabilities from "./pages/app/Liabilities";
import Reserves from "./pages/app/Reserves";
import ProofGenerator from "./pages/app/ProofGenerator";
import Summary from "./pages/app/Summary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Marketing Pages (Public) */}
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes - Require Authentication */}
            <Route path="/verify" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/proofs" element={<ProtectedRoute><ReportsList /></ProtectedRoute>} />
            <Route path="/proofs/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/inclusion" element={<ProtectedRoute><InclusionCheck /></ProtectedRoute>} />

            {/* Operator Flow Pages (Protected) */}
            <Route path="/yellow" element={<ProtectedRoute><YellowSessions /></ProtectedRoute>} />
            <Route path="/liabilities" element={<ProtectedRoute><Liabilities /></ProtectedRoute>} />
            <Route path="/reserves" element={<ProtectedRoute><Reserves /></ProtectedRoute>} />
            <Route path="/proof" element={<ProtectedRoute><ProofGenerator /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><Summary /></ProtectedRoute>} />

            {/* Legacy redirects (Protected) */}
            <Route path="/app" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/app/reports" element={<ProtectedRoute><ReportsList /></ProtectedRoute>} />
            <Route path="/app/reports/:id" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path="/app/inclusion" element={<ProtectedRoute><InclusionCheck /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
