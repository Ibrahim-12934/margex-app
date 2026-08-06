"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      setConfirmSent(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  };

  if (confirmSent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F5F0", padding: 20 }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Vérifie ta boîte mail</h1>
          <p style={{ color: "#4A5568", fontSize: 14 }}>
            On a envoyé un lien de confirmation à {email}. Clique dessus pour activer ton compte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F7F5F0", padding: 20 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "#fff", border: "1px solid #DED9CC", borderRadius: 8, padding: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>MargeX</h1>
        <p style={{ fontSize: 13, color: "#4A5568", marginBottom: 24 }}>
          {mode === "login" ? "Connecte-toi à ton compte" : "Crée ton compte gratuit"}
        </p>

        <label style={{ fontSize: 12, color: "#4A5568", display: "block", marginBottom: 4 }}>Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #DED9CC", borderRadius: 4, marginBottom: 14, fontSize: 14 }}
        />

        <label style={{ fontSize: 12, color: "#4A5568", display: "block", marginBottom: 4 }}>Mot de passe</label>
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", border: "1px solid #DED9CC", borderRadius: 4, marginBottom: 18, fontSize: 14 }}
        />

        {error && <p style={{ color: "#C8551D", fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <button
          type="submit" disabled={loading}
          style={{ width: "100%", background: "#1B2430", color: "#F7F5F0", border: "none", padding: 12, borderRadius: 6, fontWeight: 600, marginBottom: 12 }}
        >
          {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          style={{ width: "100%", background: "none", border: "none", color: "#4A5568", fontSize: 13 }}
        >
          {mode === "login" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
        </button>
      </form>
    </div>
  );
    }
