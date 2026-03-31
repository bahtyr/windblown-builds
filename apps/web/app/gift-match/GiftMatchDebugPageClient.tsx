"use client";

import {useEffect, useState} from "react";
import {type GiftMatchTemplateSpec} from "./gift-match-workflow";
import GiftMatchDebug from "./GiftMatchDebug";
import {loadGiftMatchTemplateSpecs} from "../../lib/loadGiftMatchTemplateSpecs";

/**
 * Loads matcher templates client-side for the dedicated debug route.
 *
 * @returns {JSX.Element} Debug page once matcher templates are available.
 */
export default function GiftMatchDebugPageClient(): JSX.Element {
  const [templateSpecs, setTemplateSpecs] = useState<GiftMatchTemplateSpec[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGiftMatchTemplateSpecs()
      .then((nextTemplateSpecs) => {
        if (!cancelled) {
          setTemplateSpecs(nextTemplateSpecs);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load matcher templates.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p>{error}</p>;
  }

  if (!templateSpecs) {
    return <p>Loading matcher templates...</p>;
  }

  return <GiftMatchDebug templateSpecs={templateSpecs}/>;
}
