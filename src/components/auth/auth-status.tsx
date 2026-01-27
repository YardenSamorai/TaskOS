"use client";

import { useSession } from "next-auth/react";

interface AuthStatusProps {
  children: React.ReactNode;
}

export function SignedIn({ children }: AuthStatusProps) {
  const { status } = useSession();
  
  if (status === "authenticated") {
    return <>{children}</>;
  }
  
  return null;
}

export function SignedOut({ children }: AuthStatusProps) {
  const { status } = useSession();
  
  if (status === "unauthenticated") {
    return <>{children}</>;
  }
  
  return null;
}

export function AuthLoading({ children }: AuthStatusProps) {
  const { status } = useSession();
  
  if (status === "loading") {
    return <>{children}</>;
  }
  
  return null;
}
