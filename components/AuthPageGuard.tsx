"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function AuthPageGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <p role="status" className="text-sm text-slate-600">
        Checking your session...
      </p>
    );
  }

  if (isSignedIn) {
    redirect("/");
  }

  return children;
}
