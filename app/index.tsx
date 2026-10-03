import { useAuthContext } from "@/hooks/use-auth-context";
import { Redirect } from "expo-router";

export default function Index() {
    const { isLoggedIn } = useAuthContext();
    // Redirect cleanly based on the session status so ka msee amolog in it just automatically redirects him to his/her homepage 
    if (isLoggedIn) {
      return <Redirect href="/(tabs)" />;
    }

  return <Redirect href="/login" />;
}
