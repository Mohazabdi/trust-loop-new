import { AuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/mysupabase/supabase";
import { PropsWithChildren, useEffect, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1) Load the initial session once, and subscribe to auth changes.
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        // getClaims() doesn't exist — use getSession() instead.
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) console.error("Error fetching session:", error);
        if (!mounted) return;

        if (session?.user) {
          setClaims({ sub: session.user.id, email: session.user.email });
        } else {
          setClaims(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Unexpected session error:", err);
        if (mounted) setClaims(null);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", { event: _event });
      if (session?.user) {
        setClaims({ sub: session.user.id, email: session.user.email });
      } else {
        setClaims(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2) Fetch the profile whenever claims change. Always resolve isLoading.
  useEffect(() => {
    let cancelled = false;

    if (!claims?.sub) {
      setProfile(null);
      setIsLoading(false);   // no claims → not loading
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", claims.sub)
          .maybeSingle();

        if (error) console.error("Error fetching profile:", error);
        if (!cancelled) setProfile(data ?? null);
      } catch (err) {
        console.error("Unexpected profile error:", err);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setIsLoading(false);   // ← always runs
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [claims?.sub]);

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        profile,
        isLoggedIn: !!claims,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}