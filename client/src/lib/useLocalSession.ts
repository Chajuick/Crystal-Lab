import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "retention-lab-user";

export function useLocalSession() {
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  });

  useEffect(() => {
    const sync = () => setUsername(window.localStorage.getItem(STORAGE_KEY) ?? "");
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const login = useCallback((nextUsername: string) => {
    const trimmed = nextUsername.trim();
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setUsername(trimmed);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUsername("");
  }, []);

  return {
    username,
    isLoggedIn: Boolean(username),
    login,
    logout,
  };
}
