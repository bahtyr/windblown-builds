"use client";

import {createContext, useContext, useEffect, useMemo, useRef, useState} from "react";
import {type GiftMatchTemplateSpec} from "../../app/gift-match/gift-match-workflow";
import {loadGiftMatchTemplateSpecs} from "../../lib/loadGiftMatchTemplateSpecs";
import RunBuildDialog from "./RunBuildDialog";

type RunBuildUiContextType = {
  openRunBuildDialog: (file?: File | null) => void;
};

const RunBuildUiContext = createContext<RunBuildUiContextType | null>(null);

/**
 * Provides the global new-run dialog together with app-wide paste and drop handlers.
 *
 * @param {{ children: React.ReactNode }} props - Provider children.
 * @returns {JSX.Element} Provider with global dialog and upload affordances.
 */
export function RunBuildUiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [templateSpecs, setTemplateSpecs] = useState<GiftMatchTemplateSpec[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const dragDepthRef = useRef(0);

  async function ensureTemplateSpecsLoaded(): Promise<GiftMatchTemplateSpec[]> {
    if (templateSpecs.length > 0) {
      return templateSpecs;
    }

    setTemplatesLoading(true);
    setTemplatesError(null);

    try {
      const nextTemplateSpecs = await loadGiftMatchTemplateSpecs();
      setTemplateSpecs(nextTemplateSpecs);
      return nextTemplateSpecs;
    } catch (loadError: unknown) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load matcher templates.";
      setTemplatesError(message);
      throw loadError;
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function openDialog(file?: File | null) {
    setPendingFile(file ?? null);

    try {
      await ensureTemplateSpecsLoaded();
    } catch {
      // Open the dialog even when template loading fails so the user can see the error state.
    }

    setDialogOpen(true);
  }

  useEffect(() => {
    function hasFiles(event: DragEvent): boolean {
      return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    function isImageFile(file: File | null | undefined): file is File {
      return Boolean(file && file.type.startsWith("image/"));
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event) || dialogOpen) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current += 1;
      setDragActive(true);
    }

    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event) || dialogOpen) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setDragActive(true);
    }

    function handleDragLeave(event: DragEvent) {
      if (!hasFiles(event) || dialogOpen) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setDragActive(false);
      }
    }

    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = 0;
      setDragActive(false);

      const droppedFile = Array.from(event.dataTransfer?.files ?? []).find((file) => isImageFile(file));
      if (droppedFile) {
        void openDialog(droppedFile);
      }
    }

    function handlePaste(event: ClipboardEvent) {
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.isContentEditable
      ) {
        return;
      }

      const pastedFile = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();

      if (pastedFile && isImageFile(pastedFile)) {
        event.preventDefault();
        void openDialog(pastedFile);
      }
    }

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("paste", handlePaste);
    };
  }, [dialogOpen]);

  const value = useMemo<RunBuildUiContextType>(
    () => ({
      openRunBuildDialog: (file) => {
        void openDialog(file);
      },
    }),
    [templateSpecs],
  );

  return (
    <RunBuildUiContext.Provider value={value}>
      {children}
      {dragActive && !dialogOpen ? (
        <div className="run-build-app-drop-overlay" role="presentation">
          <div className="run-build-app-drop-backdrop"/>
          <div className="run-build-app-drop-card">Drop image to create build</div>
        </div>
      ) : null}
      <RunBuildDialog
        initialFile={pendingFile}
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setPendingFile(null);
        }}
        onInitialFileHandled={() => setPendingFile(null)}
        templatesError={templatesError}
        templatesLoading={templatesLoading}
        templateSpecs={templateSpecs}
      />
    </RunBuildUiContext.Provider>
  );
}

/**
 * Reads the global new-run dialog actions.
 *
 * @returns {RunBuildUiContextType} Global new-run dialog helpers.
 */
export function useRunBuildUi(): RunBuildUiContextType {
  const context = useContext(RunBuildUiContext);
  if (!context) {
    throw new Error("RunBuildUiContext missing");
  }

  return context;
}
