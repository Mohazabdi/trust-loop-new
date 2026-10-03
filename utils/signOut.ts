import { supabase } from "@/lib/mysupabase/supabase";

export async function onSignOutButtonPress() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    return false;
  }
  console.log("Signed Out");
  return true;
}
