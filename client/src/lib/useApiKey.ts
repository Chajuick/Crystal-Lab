import { useState } from "react";

const STORAGE_KEY = "retention-lab-gemini-key";

export function getStoredApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function useApiKey() {
  const [apiKey, setApiKey] = useState(getStoredApiKey);

  function save(key: string) {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setApiKey(trimmed);
  }

  return { apiKey, save };
}
