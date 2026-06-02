// Font family constants matching RentHouse-FrontEnd's Google Fonts usage:
// - Playfair Display: serif font for titles and headings
// - Inter: sans-serif for body text, labels, buttons
export const FONTS = {
  // Playfair Display — headings, titles, hero text
  heading: 'PlayfairDisplay_700Bold',
  headingSemiBold: 'PlayfairDisplay_600SemiBold',
  headingMedium: 'PlayfairDisplay_500Medium',
  headingRegular: 'PlayfairDisplay_400Regular',

  // Inter — body text, buttons, labels, inputs
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  light: 'Inter_300Light',
} as const;
