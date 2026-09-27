import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const AuthHeaderActions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return null;
  }

  if (user) {
    const displayName =
      user.user_metadata?.full_name ||
      user.email ||
      "Account";

    return (
      <>
        <span className="max-w-36 truncate text-sm font-medium">
          {displayName}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/login")}
      >
        Log in
      </Button>

      <Button
        size="sm"
        className="bg-parking-available hover:bg-parking-available/90"
        onClick={() => navigate("/signup")}
      >
        Create account
      </Button>
    </>
  );
};

export default AuthHeaderActions;