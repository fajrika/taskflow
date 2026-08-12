"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal mendaftar");
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm text-slate-400">Nama</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
          placeholder="Nama kamu"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
          placeholder="nama@email.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
          placeholder="Minimal 6 karakter"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Mendaftar..." : "Daftar"}
      </button>
      <p className="text-center text-sm text-slate-400">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-emerald-400 hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
