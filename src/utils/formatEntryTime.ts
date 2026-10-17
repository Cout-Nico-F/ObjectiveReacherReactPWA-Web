export function formatEntryTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const entryDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (entryDay.getTime() === today.getTime()) {
    return `Hoy, ${timeStr}`;
  }
  if (entryDay.getTime() === yesterday.getTime()) {
    return `Ayer, ${timeStr}`;
  }
  const monthDay = date.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
  });
  return `${monthDay}, ${timeStr}`;
}