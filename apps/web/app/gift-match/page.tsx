import GiftMatchDebug from "./GiftMatchDebug";
import {loadGiftMatchTemplateSpecs} from "./template-specs";

/**
 * Loads the image catalog for the gift-match debug page.
 *
 * @returns {Promise<JSX.Element>} Gift-match debug page with the server-generated template list.
 */
export default async function GiftMatchPage(): Promise<JSX.Element> {
  const templateSpecs = await loadGiftMatchTemplateSpecs();

  return <GiftMatchDebug templateSpecs={templateSpecs}/>;
}
