import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");

  const { registered } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">
            ✅
          </div>
          <h1 className="text-2xl font-bold text-white">Taskflow</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kelola pekerjaan, deadline &amp; side project
          </p>
        </div>
        {registered && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Pendaftaran berhasil! Silakan masuk.
          </div>
        )}
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ← Kembali
          </Link>
        </p>
      </div>
    </div>
  );
}
