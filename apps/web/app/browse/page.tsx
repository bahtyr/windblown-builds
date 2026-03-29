import EntityBrowser from "../../components/entity/EntityBrowser";

export default function BrowsePage() {
  return (
    <>
      <section className="body-wrapper decks-page-header">
        <div>
          <h1 className="decks-page-title">Browse items</h1>
          <p className="decks-page-copy">Search all items in one place and compare what fits your build.</p>
        </div>
      </section>
      <EntityBrowser/>
    </>
  );
}
