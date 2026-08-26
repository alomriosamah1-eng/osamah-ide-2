/** Design philosophy — Quiet Intelligence Observatory: the desktop shell itself is the product, not a landing page. */
import AuthGate from "@/components/AuthGate";
import OsamahWorkspace from "@/components/OsamahWorkspace";
import TemporaryPreviewWorkspace from "@/components/TemporaryPreviewWorkspace";
import { trpc } from "@/lib/trpc";
import { isTemporaryPreview } from "@/lib/preview-mode";

export default function Home() {
  const previewMode = isTemporaryPreview(window.location.search);
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, { retry: false, enabled: !previewMode });
  if (previewMode) return <TemporaryPreviewWorkspace />;
  if (isLoading) return null;
  return user ? <OsamahWorkspace /> : <AuthGate onAuthenticated={() => { void refetch(); }} />;
}
