import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { frFR } from "@clerk/localizations";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import App from "./App";
import { MissingConfig } from "./components/MissingConfig";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const root = createRoot(document.getElementById("root")!);

const missing: string[] = [];
if (!convexUrl) missing.push("VITE_CONVEX_URL");
if (!clerkKey || clerkKey.includes("REMPLACER")) {
  missing.push("VITE_CLERK_PUBLISHABLE_KEY");
}

if (missing.length > 0) {
  // Les clés ne sont pas encore configurées : on affiche les instructions de setup
  // plutôt que de planter au démarrage.
  root.render(
    <StrictMode>
      <MissingConfig missing={missing} />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={clerkKey} localization={frFR}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </StrictMode>,
  );
}
