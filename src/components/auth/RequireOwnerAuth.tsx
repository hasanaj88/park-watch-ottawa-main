import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type RequireOwnerAuthProps = {
  children: React.ReactNode;
};

const RequireOwnerAuth = ({ children }: RequireOwnerAuthProps) => {
  const location = useLocation();

  const [session, setSession] = useState<Session | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;

      setSession(currentSession);

      if (!currentSession) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // Check account role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentSession.user.id)
        .single();

      if (profileError || !profile) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const validRole =
        profile.role === "parking_owner" ||
        profile.role === "admin";

      if (!validRole) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // Check MFA assurance level
      const { data: aalData, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const hasMfa = aalData.currentLevel === "aal2";

      setAllowed(hasMfa);
      setLoading(false);
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Checking owner access...
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!allowed) {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
};

export default RequireOwnerAuth;