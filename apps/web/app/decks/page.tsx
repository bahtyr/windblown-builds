import DecksLibrary from "../../components/deck/DecksLibrary";
import {loadGiftMatchTemplateSpecs} from "../gift-match/template-specs";

export default async function DecksPage() {
  const templateSpecs = await loadGiftMatchTemplateSpecs();

  return <DecksLibrary templateSpecs={templateSpecs}/>;
}
