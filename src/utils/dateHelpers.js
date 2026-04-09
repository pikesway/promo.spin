import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function utcToLocalInputValue(utcString) {
  if (!utcString) return '';
  const zonedDate = toZonedTime(new Date(utcString), LOCAL_TZ);
  return format(zonedDate, "yyyy-MM-dd'T'HH:mm", { timeZone: LOCAL_TZ });
}

export function localInputValueToISO(localString) {
  if (!localString) return null;
  const utcDate = fromZonedTime(localString, LOCAL_TZ);
  return utcDate.toISOString();
}
