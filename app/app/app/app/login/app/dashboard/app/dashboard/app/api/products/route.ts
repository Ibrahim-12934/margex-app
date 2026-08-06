import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shop_id");

  let query = supabase.from("products").select("*, suppliers(name)").eq("user_id", user.id);
  if (shopId) query = query.eq("shop_id", shopId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await request.json();

  const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
  if (!sub || sub.plan === "gratuit") {
    const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { error: "Limite du plan gratuit atteinte (10 produits). Passe au plan Pro pour continuer." },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from("products")
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data && data.cost_xof > 0) {
    await supabase.from("cost_history").insert({ product_id: data.id, cost_xof: data.cost_xof });
  }

  return NextResponse.json({ product: data });
    }
