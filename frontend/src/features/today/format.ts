const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmt = (n: number): string => n.toLocaleString('en-US');

/** "Thursday, 30 Oct" */
export const dateLabel = (d: Date): string =>
  `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** The API's "YYYY-MM-DD" day as a label, built from its parts so the device time zone cannot shift it. */
export const dayLabel = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number);
  return y && m && d ? dateLabel(new Date(y, m - 1, d)) : day;
};
