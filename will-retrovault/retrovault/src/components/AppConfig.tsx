"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { type Features, DEFAULT_FEATURES } from "@/data/navConfig";
import { RETRO_DEFAULTS } from "@/data/platformGroups";

type AppConfig = {
  appName: string;
  tagline: string;
  ownerName: string;
  themeColor: string;
  currency: string;
  dateFormat: string;
  standaloneMode: boolean;
  features: Features;
  platforms: string[];
  runtimeEnv: string;
};

const DEFAULTS: AppConfig = {
  appName: "RetroVault",
  tagline: "Your Retro Gaming Collection Engine",
  ownerName: "",
  themeColor: "green",
  currency: "$",
  dateFormat: "US",
  standaloneMode: true,
  features: DEFAULT_FEATURES,
  platforms: RETRO_DEFAULTS,
  runtimeEnv: "development",
};

const AppConfigContext = createContext<AppConfig>(DEFAULTS);
export const useAppConfig = () => useContext(AppConfigContext);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => setConfig({ ...DEFAULTS, ...d }))
      .catch(() => {});
  }, []);

  return (
    <AppConfigContext.Provider value={config}>
      {children}
    </AppConfigContext.Provider>
  );
}
