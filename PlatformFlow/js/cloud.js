/* PlatformFlow Supabase client and shared-state helpers.
 * The publishable key is designed for browser use. Keep RLS enabled.
 */
(() => {
  const SUPABASE_URL = "https://nkvhrcofqufdejirnqyw.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_P9cr3775P80Jb96e6ApQVw_sH-MoQ-3";
  if (!window.supabase?.createClient) {
    console.error("Supabase client library did not load.");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.platformFlowSupabase = client;

  window.platformFlowCloud = {
    async currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data.user || null;
    },
    async loadState() {
      const user = await this.currentUser();
      if (!user) return null;
      const { data, error } = await client
        .from("platformflow_user_state")
        .select("trains,rake_links")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Could not load shared PlatformFlow data:", error.message);
        return null;
      }
      return data || { trains: [], rake_links: [] };
    },
    async saveState(state) {
      const user = await this.currentUser();
      if (!user) return;
      const { error } = await client.from("platformflow_user_state").upsert({
        user_id: user.id,
        trains: Array.isArray(state.trains) ? state.trains : [],
        rake_links: Array.isArray(state.rake_links) ? state.rake_links : [],
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
      if (error) {
        console.error("Could not save shared PlatformFlow data:", error.message);
        window.dispatchEvent(new CustomEvent("platformflow:cloud-error", { detail: error.message }));
      } else {
        window.dispatchEvent(new CustomEvent("platformflow:cloud-saved"));
      }
    }
  };
})();
