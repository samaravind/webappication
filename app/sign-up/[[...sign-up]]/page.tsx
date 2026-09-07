import { auth } from "@clerk/nextjs/server";
import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import AuthPageGuard from "../../../components/AuthPageGuard";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#f5f7fb] px-4 py-10 text-slate-950 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] before:bg-[size:42px_42px] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[linear-gradient(135deg,rgba(20,184,166,0.14),transparent_38%,rgba(245,158,11,0.12))]">
      <AuthPageGuard>
        <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/5 backdrop-blur lg:grid-cols-[0.95fr_1fr]">
        <section className="hidden bg-slate-950 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">
              User Studio
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-normal">
              Create an account to enter the workspace.
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              After signup, you can manage the full user directory from the protected dashboard.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-300">
            Authentication is handled by Clerk before the app content is shown.
          </div>
        </section>
        <section className="flex items-center justify-center px-4 py-8 sm:px-8">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </section>
        </div>
      </AuthPageGuard>
    </div>
  );
}
