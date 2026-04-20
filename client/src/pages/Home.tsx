/*
Legacy file placeholder
- Home.tsx is no longer used as the main route.
- Keep this file syntactically valid to avoid stale dev-server parse errors.
*/

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLocalSession } from "@/lib/useLocalSession";

export default function Home() {
  const [, navigate] = useLocation();
  const { isLoggedIn } = useLocalSession();

  useEffect(() => {
    navigate(isLoggedIn ? "/app/home" : "/");
  }, [isLoggedIn, navigate]);

  return null;
}
