"use client";

import {type ReactNode} from "react";
import {DeckProvider} from "../deck/DeckContext";
import {RunBuildUiProvider} from "../deck/RunBuildUiContext";
import {DeckUiProvider} from "../deck/DeckUiContext";
import {LikeProvider} from "../like/LikeContext";

/**
 * Mounts the client-side app providers used across the web app.
 *
 * @param {{ children: ReactNode }} props - Provider children.
 * @returns {JSX.Element} Provider tree for the app shell.
 */
export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DeckProvider>
      <DeckUiProvider>
        <LikeProvider>
          <RunBuildUiProvider>
            {children}
          </RunBuildUiProvider>
        </LikeProvider>
      </DeckUiProvider>
    </DeckProvider>
  );
}
