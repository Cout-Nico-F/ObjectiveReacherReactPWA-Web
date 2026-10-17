export function doTitlesShareCoreMeaning(oldTitle: string, newTitle: string): boolean {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

  const a = clean(oldTitle);
  const b = clean(newTitle);
  if (a.length === 0 || b.length === 0) return true;
  if (
    oldTitle.trim().toLowerCase() === 'mi objetivo' ||
    oldTitle.trim().toLowerCase().startsWith('objetivo ')
  ) {
    return true;
  }
  return a.some((w) => b.includes(w));
}