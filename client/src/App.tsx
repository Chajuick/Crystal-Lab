/*
Design reminder for App.tsx
- Route structure must separate pre-login landing from the logged-in app.
- App routes should map directly to Home, Chapters, Play, and Profile.
- Keep fallback behavior simple and deterministic.
*/

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppHome from "./pages/AppHome";
import Chapters from "./pages/Chapters";
import Landing from "./pages/Landing";
import Play from "./pages/Play";
import Profile from "./pages/Profile";
import { useLocalSession } from "./lib/useLocalSession";

function AppEntry() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useLocalSession();

  useEffect(() => {
    navigate(isLoggedIn ? "/app/home" : "/");
  }, [isLoggedIn, navigate]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={AppEntry} />
      <Route path="/app/home" component={AppHome} />
      <Route path="/app/chapters" component={Chapters} />
      <Route path="/app/play" component={Play} />
      <Route path="/app/profile" component={Profile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
