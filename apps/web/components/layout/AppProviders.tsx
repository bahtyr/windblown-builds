"use client";

import {type ReactNode} from "react";
import {DeckProvider} from "../deck/DeckContext";
import {RunBuildUiProvider} from "../deck/RunBuildUiContext";
import {DeckUiProvider} from "../deck/DeckUiContext";
import {LikeProvider} from "../like/LikeContext";
import {type GiftMatchTemplateSpec} from "../../app/gift-match/gift-match-workflow";

/**
 * Mounts the client-side app providers used across the web app.
 *
 * @param {{ children: ReactNode; templateSpecs: GiftMatchTemplateSpec[] }} props - Provider children and matcher templates.
 * @returns {JSX.Element} Provider tree for the app shell.
 */
export default function AppProviders({
  children,
  templateSpecs,
}: {
  children: ReactNode;
  templateSpecs: GiftMatchTemplateSpec[];
}) {
  return (
    <DeckProvider>
      <DeckUiProvider>
        <LikeProvider>
          <RunBuildUiProvider templateSpecs={templateSpecs}>
            {children}
          </RunBuildUiProvider>
        </LikeProvider>
      </DeckUiProvider>
    </DeckProvider>
  );
}
