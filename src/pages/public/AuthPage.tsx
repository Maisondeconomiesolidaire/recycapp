import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { AuthPanel } from "../../components/AuthPanel";

export function AuthPage() {
  const location = useLocation();
  const redirectUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("redirect_url") || "/boutique";
  }, [location.search]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-xl items-center px-5 py-12">
      <div className="w-full rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_rgba(24,24,27,0.1)] sm:p-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-black text-orange-500">
          R
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950">Bienvenue sur Recycapp</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
          Connectez-vous ou créez votre compte pour continuer.
        </p>
        <div className="mt-7 text-left">
          <AuthPanel redirectUrl={redirectUrl} />
        </div>
      </div>
    </div>
  );
}
