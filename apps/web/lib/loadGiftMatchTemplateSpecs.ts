import {type GiftMatchTemplateSpec} from "../app/gift-match/gift-match-workflow";

let templateSpecsPromise: Promise<GiftMatchTemplateSpec[]> | null = null;

/**
 * Loads the generated matcher template catalog from the public JSON file.
 *
 * @returns {Promise<GiftMatchTemplateSpec[]>} Matcher template metadata cached for the current session.
 */
export function loadGiftMatchTemplateSpecs(): Promise<GiftMatchTemplateSpec[]> {
  if (!templateSpecsPromise) {
    templateSpecsPromise = fetch("/gift-match-templates.json", {cache: "no-store"})
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load matcher templates: ${response.status}`);
        }

        return response.json() as Promise<GiftMatchTemplateSpec[]>;
      });
  }

  return templateSpecsPromise;
}
