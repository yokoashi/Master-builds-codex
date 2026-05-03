import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Router, Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import CodexPage from "./pages/CodexPage";
import NotFound from "./pages/not-found";
import { ThemeProvider } from "./lib/theme";

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={CodexPage} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
