import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Router, Switch, Route } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import CodexPage from "./pages/CodexPage";
import NotFound from "./pages/not-found";
import SetupScreen from "./components/SetupScreen";

interface ConfigStatus {
  hasPerplexity: boolean;
  hasClaude: boolean;
  perplexityMask: string;
  claudeMask: string;
}

function AppInner() {
  const { data, isLoading, refetch } = useQuery<ConfigStatus>({
    queryKey: ["/api/config"],
    staleTime: Infinity, // only re-check when we explicitly refetch
  });

  // Still loading — render nothing (avoids flash)
  if (isLoading || !data) return null;

  // No Perplexity key at all → show setup screen
  if (!data.hasPerplexity) {
    return (
      <SetupScreen
        onComplete={() => refetch()}
        savedMasks={{ perplexity: data.perplexityMask, claude: data.claudeMask }}
      />
    );
  }

  // Keys present — show the app (pass masks so settings modal can show them)
  return (
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/" component={() => <CodexPage configMasks={{ perplexity: data.perplexityMask, claude: data.claudeMask }} onConfigUpdate={refetch} />} />
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
      <Toaster />
    </QueryClientProvider>
  );
}
