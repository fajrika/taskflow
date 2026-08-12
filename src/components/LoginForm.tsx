"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Email atau password salah");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Masuk..." : "Masuk"}
      </button>
      <p className="text-center text-sm text-slate-400">
        Belum punya akun?{" "}
        <Link href="/register" className="text-emerald-400 hover:underline">
          Daftar
        </Link>
      </p>
    </form>
  );
}
