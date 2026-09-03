import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AuthPanel } from "../../components/AuthPanel";

export function AuthPage() {
  const location = useLocation();
  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect_url") || "/boutique";
  }, [location.search]);

  return <AuthPanel redirectUrl={redirectUrl} />;
}
