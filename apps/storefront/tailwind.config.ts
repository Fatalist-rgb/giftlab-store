import type { Config } from 'tailwindcss';

/** v2 "playful" tokens — kept in sync with the approved demo design. */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17131A',
        mandarin: '#FF6A2B',
        pink: '#FF3D8B',
        lime: '#B8E63A',
        cream: '#FFF7EC',
      },
      fontFamily: {
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        body: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        offset: '4px 5px 0 #17131A',
        'offset-sm': '2.5px 3px 0 #17131A',
      },
    },
  },
  plugins: [],
} satisfies Config;
