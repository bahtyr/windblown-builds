"use client";

type Props = {
  search: string;
  onSearch: (v: string) => void;
  onClear: () => void;
};

/**
 * Render the top search controls for browse.
 *
 * @param {Props} props - Filter values and callbacks.
 * @returns {JSX.Element} Filter controls.
 */
export default function Filters({search, onSearch, onClear}: Props) {
  return (
    <>
      <input
        id="searchInput"
        type="text"
        placeholder="Search name/category/text..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <button className="btn" type="button" onClick={onClear}>
        Clear
      </button>
    </>
  );
}
