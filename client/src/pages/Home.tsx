/** Design philosophy — Quiet Intelligence Observatory: the desktop shell itself is the product, not a landing page. */
import AuthGate from "@/components/AuthGate";
import OsamahWorkspace from "@/components/OsamahWorkspace";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, { retry: false });
  if (isLoading) return null;
  return user ? <OsamahWorkspace /> : <AuthGate onAuthenticated={() => { void refetch(); }} />;
}
