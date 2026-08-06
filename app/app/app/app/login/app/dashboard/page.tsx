import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shops } = await supabase.from("shops").select("*").eq("user_id", user.id).order("created_at");

  let shopList = shops ?? [];
  if (shopList.length === 0) {
    const { data: newShop } = await supabase
      .from("shops")
      .insert({ name: "Ma boutique", user_id: user.id })
      .select()
      .single();
    if (newShop) shopList = [newShop];
  }

  const { data: suppliers } = await supabase.from("suppliers").select("*").eq("user_id", user.id).order("name");
  const { data: subscription } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single();

  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      initialShops={shopList}
      initialSuppliers={suppliers ?? []}
      plan={subscription?.plan ?? "gratuit"}
    />
  );
}
