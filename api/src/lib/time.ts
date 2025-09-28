export function isMarketOpenIST(date = new Date()): boolean {
  // Convert to IST (UTC+5:30)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600 * 1000);
  const day = ist.getUTCDay(); // 0 Sun ... 6 Sat
  if (day === 0 || day === 6) return false;
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  // IST 09:15 → 15:30 translates directly since we already shifted to IST
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  return totalMinutes >= open && totalMinutes <= close;
}
