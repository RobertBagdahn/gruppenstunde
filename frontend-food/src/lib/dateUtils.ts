export function getNextWeekend(): { friday: string; sunday: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();

  let daysUntilFriday: number;
  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    daysUntilFriday = 5 - dayOfWeek;
  } else {
    daysUntilFriday = (5 + 7 - dayOfWeek) % 7 || 7;
  }

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(18, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(14, 0, 0, 0);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  return { friday: fmt(friday), sunday: fmt(sunday) };
}
