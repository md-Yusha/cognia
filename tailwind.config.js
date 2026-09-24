/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAF8F5',
          100: '#F5F1EA',
          200: '#ECE4D6',
          300: '#DFD2BD',
          900: '#3A3226',
        },
        sage: {
          50: '#F1F6F3',
          100: '#E2EEE5',
          200: '#C7DECDB',
          300: '#A4CBB1',
          400: '#7EAF8F',
          500: '#59936E',
          600: '#437756',
          700: '#335D43',
          800: '#274733',
        },
        peach: {
          50: '#FDF6F2',
          100: '#FAECE4',
          200: '#F4D8C9',
          300: '#EBBBA5',
          400: '#DE9C80',
          500: '#C87453',
          600: '#A95838',
          700: '#864127',
        },
        lilac: {
          50: '#F8F6FA',
          100: '#EFEAF4',
          200: '#DDD3E7',
          300: '#C3B4D3',
          400: '#A592BD',
          500: '#836EA1',
          600: '#675283',
          700: '#503D68',
        },
        skyPastel: {
          50: '#F2F8FA',
          100: '#E2F1F5',
          200: '#C4E3EB',
          300: '#9ECFDA',
          500: '#529DB1',
          700: '#336B7B',
        },
        charcoal: {
          100: '#E2E8F0',
          300: '#CBD5E1',
          500: '#64748B',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        handwritten: ['PatrickHand_400Regular'],
        friendly: ['Nunito_700Bold'],
        body: ['Nunito_600SemiBold'],
      },
      fontSize: {
        'elderly-sm': ['18px', '28px'],
        'elderly-base': ['22px', '32px'],
        'elderly-lg': ['26px', '36px'],
        'elderly-xl': ['32px', '42px'],
        'elderly-2xl': ['40px', '52px'],
      }
    },
  },
  plugins: [],
};
