/** Design philosophy — Quiet Intelligence Observatory: the desktop shell itself is the product, not a landing page. */
import AuthGate, { hasLocalSession } from "@/components/AuthGate";
import OsamahWorkspace from "@/components/OsamahWorkspace";
import { useState } from "react";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(() => hasLocalSession());
  return authenticated ? <OsamahWorkspace /> : <AuthGate onAuthenticated={() => setAuthenticated(true)} />;
}
