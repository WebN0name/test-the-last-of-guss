const dateTime = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const timeOnly = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)} — ${timeOnly.format(new Date(endIso))}`;
}
