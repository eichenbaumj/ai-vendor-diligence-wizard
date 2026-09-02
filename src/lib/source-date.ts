/*
  One phrase for a source's date (methodology 1.8). A citation carries the
  date code parsed from the page address or the search tool's page age
  ("YYYY-MM-DD" or "YYYY-MM") when it had one; otherwise the report shows
  the retrieval date, as before. Formatting only: no inference here.
*/

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatPublished(published: string): string | null {
  const m = published.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return null;
  return m[3] ? `${month} ${Number(m[3])}, ${m[1]}` : `${month} ${m[1]}`;
}

export function formatRetrieved(retrievedAt: string): string {
  return new Date(retrievedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "published Mar 15, 2024" when the page carried a date, else "retrieved <date>". */
export function sourceDatePhrase(s: { retrieved_at: string; published_at?: string | null }): string {
  const published = s.published_at ? formatPublished(s.published_at) : null;
  return published ? `published ${published}` : `retrieved ${formatRetrieved(s.retrieved_at)}`;
}
