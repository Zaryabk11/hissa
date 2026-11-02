// Plan sheet copy, from docs/design/Hissa Screens.html (screens j and k).
export const planContent = {
  title: "Here's your hissa",
  lightTitle: "You've had a full day. Here's a light plate",
  lightNote: 'Smaller portions of the same food. A lighter plate keeps the day steady.',
  estimate: (n: string) => `About ${n} kcal, estimate`,
  ate: 'I ate this',
  adjust: 'Adjust',
  empty: 'Nothing on the plate to plan yet.',
  plateLabel: (rows: string) => `Plan: ${rows}`,
  lightPlateLabel: (rows: string) => `Light plan: ${rows}`,
} as const;
