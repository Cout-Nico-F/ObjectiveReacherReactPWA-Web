export function doTitlesShareCoreMeaning(titleA: string, titleB: string): boolean {
  const cleanA = titleA.toLowerCase().trim();
  const cleanB = titleB.toLowerCase().trim();
  if (cleanA === cleanB) return true;

  const wordsA = cleanA.split(/\s+/).filter((w) => w.length > 3);
  const wordsB = cleanB.split(/\s+/).filter((w) => w.length > 3);

  return wordsA.some((w) => wordsB.includes(w));
}
