"use client";

import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {usePathname} from "next/navigation";

export type GearCollectionEditorUiContextType = {
  open: boolean;
  openGearCollectionEditor: () => void;
  closeGearCollectionEditor: () => void;
};

type GearCollectionEditorUiProviderProps = {
  children: ReactNode;
  keepOpenPathname?: string;
};

const GearCollectionEditorUiContext = createContext<GearCollectionEditorUiContextType | null>(null);

/**
 * Provides shared open and close state for the collection editor shell.
 *
 * @param {GearCollectionEditorUiProviderProps} props - Provider children and route constraints.
 * @returns {JSX.Element} Shared editor UI state provider.
 */
export function GearCollectionEditorUiProvider({
  children,
  keepOpenPathname,
}: GearCollectionEditorUiProviderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!keepOpenPathname || pathname === keepOpenPathname) return;
    setOpen(false);
  }, [keepOpenPathname, pathname]);

  const value = useMemo<GearCollectionEditorUiContextType>(
    () => ({
      open,
      openGearCollectionEditor: () => setOpen(true),
      closeGearCollectionEditor: () => setOpen(false),
    }),
    [open],
  );

  return <GearCollectionEditorUiContext.Provider value={value}>{children}</GearCollectionEditorUiContext.Provider>;
}

/**
 * Reads shared UI state for the collection editor shell.
 *
 * @returns {GearCollectionEditorUiContextType} Shared editor UI actions and state.
 */
export function useGearCollectionEditorUi(): GearCollectionEditorUiContextType {
  const ctx = useContext(GearCollectionEditorUiContext);
  if (!ctx) throw new Error("GearCollectionEditorUiContext missing");
  return ctx;
}
