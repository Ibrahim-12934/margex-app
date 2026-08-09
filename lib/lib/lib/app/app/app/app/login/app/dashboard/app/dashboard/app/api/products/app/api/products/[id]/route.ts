import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await request.json();

  const { data: existing } = await supabase.from("products").select("cost_xof").eq("id", id).eq("user_id", user.id).single();
  if (!existing) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  const costChanged = typeof body.cost_xof === "number" && body.cost_xof !== existing.cost_xof;
  const updatePayload = {
    ...body,
    last_cost_xof: costChanged ? existing.cost_xof : undefined,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (costChanged) {
    await supabase.from("cost_history").insert({ product_id: id, cost_xof: body.cost_xof });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
    }
