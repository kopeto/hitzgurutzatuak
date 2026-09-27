export function translate(messages, key, parameters = {}) {
  const message = key.split('.').reduce((value, part) => value?.[part], messages);
  if (typeof message !== 'string') return key;

  return message.replace(/\{(\w+)\}/g, (_, name) => String(parameters[name] ?? `{${name}}`));
}

export function formatDate(value) {
  return value ? new Intl.DateTimeFormat('eu').format(new Date(value)) : '—';
}

export function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`;
}
