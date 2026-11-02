const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmt = (n: number): string => n.toLocaleString('en-US');

/** "Thursday, 30 Oct" */
export const dateLabel = (d: Date): string => `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** "Lunch, 1:10 pm" */
export function mealTimeLabel(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  const slot = h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 19 ? 'Snack' : 'Dinner';
  return `${slot}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
