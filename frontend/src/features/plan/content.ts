// Plan sheet copy, from docs/design/Hissa Screens.html (screens j and k).
export const planContent = {
  title: "Here's your hissa",
  lightTitle: 'A lighter plate',
  lightNote: 'You have eaten well today. A lighter plate keeps you balanced.',
  estimate: (n: string) => `About ${n} kcal, estimate`,
  ate: 'I ate this',
  adjust: 'Adjust',
  empty: 'Nothing on the plate to plan yet.',
  plateLabel: (rows: string) => `Plan: ${rows}`,
  lightPlateLabel: (rows: string) => `Light plan: ${rows}`,
} as const;
