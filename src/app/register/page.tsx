import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import RegisterForm from "@/components/RegisterForm";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">
            ✅
          </div>
          <h1 className="text-2xl font-bold text-white">Buat Akun</h1>
          <p className="mt-1 text-sm text-slate-400">Gratis, data hanya untuk kamu</p>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          <Link href="/" className="hover:underline">
            ← Kembali
          </Link>
        </p>
      </div>
    </div>
  );
}
