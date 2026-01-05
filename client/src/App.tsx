import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Home from "@/pages/Home";
import ClaimWizard from "@/pages/wizard/ClaimWizard";
import TrackClaim from "@/pages/TrackClaim";
import MyClaimsHistory from "@/pages/MyClaimsHistory";
import AgentChat from "@/pages/AgentChat";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminClaimDetails from "@/pages/admin/AdminClaimDetails";
import AdminSettings from "@/pages/admin/AdminSettings";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

// Protected Route Component
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    // Redirect to login handled by useAuth or the page logic usually, 
    // but here we can just show a "Not Authorized" message or redirect explicitly.
    // Given replit auth flow, we redirect to the API login endpoint.
    window.location.href = "/api/login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <div className="flex flex-col min-h-screen font-tajawal">
      <Navbar />
      <main className="flex-1">
        <Switch>
          {/* Public Routes */}
          <Route path="/" component={Home} />
          <Route path="/new" component={ClaimWizard} />
          <Route path="/track" component={TrackClaim} />
          <Route path="/history" component={MyClaimsHistory} />
          <Route path="/agent" component={AgentChat} />
          
          {/* Admin Routes */}
          <Route path="/admin">
            <ProtectedRoute component={AdminDashboard} />
          </Route>
          <Route path="/admin/claims/:id">
            <ProtectedRoute component={AdminClaimDetails} />
          </Route>
          <Route path="/admin/settings">
            <ProtectedRoute component={AdminSettings} />
          </Route>

          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
