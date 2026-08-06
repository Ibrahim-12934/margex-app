"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { fmt, fromXOF, toXOF, computeMargin, type Currency } from "@/lib/margin";
import {
  Plus, TrendingUp, AlertTriangle, Package, X, Trash2,
  Store, LogOut, ChevronDown, ArrowUpDown,
} from "lucide-react";

const COLORS = {
  paper: "#F7F5F0", ink: "#1B2430", inkSoft: "#4A5568", line: "#DED9CC",
  card: "#FFFFFF", signal: "#C8551D", moss: "#3D6B4A", amber: "#B98900",
};

type Shop = { id: string; name: string };
type Supplier = { id: string; name: string };
type Product = {
  id: string; shop_id: string; name: string; supplier_id: string | null;
  cost_xof: number; price_xof: number; fee_pct: number;
  stock: "en_stock" | "faible" | "rupture"; last_cost_xof: number | null;
  margin_alert_threshold_pct: number; url: string | null; notes: string | null;
  suppliers?: { name: string } | null;
};

export default function DashboardClient({
  userEmail, initialShops, initialSuppliers, plan,
}: {
  userEmail: string; initialShops: Shop[]; initialSuppliers: Supplier[]; plan: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [activeShop, setActiveShop] = useState<string>(initialShops[0]?.id ?? "");
  const [suppliers] = useState<Supplier[]>(initialSuppliers);
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState<Currency>("XOF");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (shopId: string) => {
    if (!shopId) return;
    setLoading(true);
    const res = await fetch(`/api/products?shop_id=${shopId}`);
    const json = await res.json();
    if (res.ok) setProducts(json.products ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeShop) loadProducts(activeShop);
  }, [activeShop, loadProducts]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const createShop = async (name: string) => {
    const res = await fetch("/api/shops", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (res.ok) {
      setShops((s) => [...s, json.shop]);
      setActiveShop(json.shop.id);
    }
    setShowShopPicker(false);
  };

  const saveProduct = async (p: Partial<Product>) => {
    setError(null);
    const isNew = !p.id;
    const url = isNew ? "/api/products" : `/api/products/${p.id}`;
    const method = isNew ? "POST" : "PATCH";
    const payload = isNew ? { ...p, shop_id: activeShop } : p;

    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }

    await loadProducts(activeShop);
    setShowForm(false);
    setEditing(null);
  };

  const deleteProduct = async (id: string) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const health = useMemo(() => {
    if (products.length === 0) return null;
    const withMargins = products.map((p) => ({ ...p, ...computeMargin(p) }));
    const best = [...withMargins].sort((a, b) => b.marginXOF - a.marginXOF)[0];
    const worst = [...withMargins].sort((a, b) => a.marginPct - b.marginPct)[0];
    const totalMarginXOF = withMargins.reduce((s, p) => s + p.marginXOF, 0);
    return { best, worst, totalMarginXOF, count: products.length };
  }, [products]);

  const supplierComparisons = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (!key) return;
      groups[key] = groups[key] || [];
      groups[key].push(p);
    });
    return Object.values(groups).filter((g) => g.length > 1 && new Set(g.map((p) => p.supplier_id)).size > 1);
  }, [products]);

  const alerts = useMemo(() => {
    let n = 0;
    products.forEach((p) => {
      if (p.stock === "rupture") n++;
      if (p.last_cost_xof && p.last_cost_xof !== p.cost_xof) n++;
      const { marginPct } = computeMargin(p);
      if (marginPct < (p.margin_alert_threshold_pct ?? 15)) n++;
    });
    return n;
  }, [products]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, color: COLORS.ink, fontFamily: "'Iowan Old Style', Georgia, serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .mono { font-family: 'JetBrains Mono', Menlo, monospace; }
        button { cursor: pointer; font-family: inherit; }
      `}</style>

      <header style={{ borderBottom: `1px solid ${COLORS.line}`, padding: "20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 26, margin: 0, fontWeight: 700 }}>MargeX</h1>
            <div className="mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>{userEmail} · plan {plan}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
            <button
              onClick={() => setShowShopPicker(!showShopPicker)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.card, border: `1px solid ${COLORS.line}`, padding: "8px 12px", borderRadius: 4, fontSize: 13 }}
            >
              <Store size={14} /> {shops.find((s) => s.id === activeShop)?.name ?? "Boutique"} <ChevronDown size={14} />
            </button>
            {showShopPicker && (
              <ShopPicker shops={shops} active={activeShop} onSelect={(id) => { setActiveShop(id); setShowShopPicker(false); }} onCreate={createShop} onClose={() => setShowShopPicker(false)} />
            )}
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ padding: "8px 10px", border: `1px solid ${COLORS.line}`, borderRadius: 4, fontSize: 13, background: COLORS.card }}>
              <option value="XOF">FCFA</option>
              <option value="EUR">Euro</option>
            </select>
            <button onClick={signOut} title="Déconnexion" style={{ background: "none", border: "none", padding: 8, color: COLORS.inkSoft }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px 80px" }}>
        {health && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: COLORS.line, border: `1px solid ${COLORS.line}`, marginBottom: 20 }}>
            <StatBlock label="Produits" value={String(health.count)} />
            <StatBlock label="Marge totale" value={fmt(fromXOF(health.totalMarginXOF, currency), currency)} valueColor={health.totalMarginXOF >= 0 ? COLORS.moss : COLORS.signal} />
            <StatBlock label="Alertes" value={String(alerts)} valueColor={alerts > 0 ? COLORS.signal : COLORS.ink} icon={alerts > 0 ? <AlertTriangle size={16} color={COLORS.signal} /> : null} />
          </div>
        )}

        {health && (health.best || health.worst) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {health.best && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.moss}`, padding: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: "uppercase", marginBottom: 4 }}>Meilleur produit</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{health.best.name}</div>
                <div className="mono" style={{ fontSize: 12, color: COLORS.moss }}>{fmt(fromXOF(health.best.marginXOF, currency), currency)} de marge</div>
              </div>
            )}
            {health.worst && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderLeft: `3px solid ${COLORS.amber}`, padding: 14 }}>
                <div className="mono" style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: "uppercase", marginBottom: 4 }}>À surveiller</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{health.worst.name}</div>
                <div className="mono" style={{ fontSize: 12, color: COLORS.amber }}>{health.worst.marginPct.toFixed(1)}% de marge</div>
              </div>
            )}
          </div>
        )}

        {supplierComparisons.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
              <ArrowUpDown size={14} /> Même produit, fournisseurs différents
            </div>
            {supplierComparisons.map((group, i) => (
              <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, padding: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{group[0].name}</div>
                {group.sort((a, b) => computeMargin(b).marginXOF - computeMargin(a).marginXOF).map((p) => {
                  const m = computeMargin(p);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                      <span style={{ color: COLORS.inkSoft }}>{p.suppliers?.name ?? "Fournisseur"}</span>
                      <span className="mono" style={{ fontWeight: 600, color: m.marginXOF >= 0 ? COLORS.moss : COLORS.signal }}>{fmt(fromXOF(m.marginXOF, currency), currency)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.ink, color: COLORS.paper, border: "none", padding: "10px 16px", borderRadius: 4, fontWeight: 600 }}
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.inkSoft }}>Chargement...</div>
        ) : products.length === 0 ? (
          <div style={{ border: `1px dashed ${COLORS.line}`, padding: 40, textAlign: "center", background: COLORS.card }}>
            <Package size={26} color={COLORS.inkSoft} style={{ marginBottom: 10 }} />
            <div>Aucun produit dans cette boutique.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {products.map((p) => (
              <ProductRow key={p.id} product={p} currency={currency} onEdit={() => { setEditing(p); setShowForm(true); }} onDelete={() => deleteProduct(p.id)} />
