import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,jsx,ts,tsx}',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: [
                    'Inter', ...defaultTheme.fontFamily.sans,
                ],
            },
            colors: {
                // Shadcn Theme Variables
                plain: "var(--plain)",
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                card: {
                    DEFAULT: 'var(--card)',
                    foreground: 'var(--card-foreground)',
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)',
                },
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    foreground: 'var(--secondary-foreground)',
                },
                muted: {
                    DEFAULT: 'var(--muted)',
                    foreground: 'var(--muted-foreground)',
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    foreground: 'var(--accent-foreground)',
                },
                destructive: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)',
                },
                border: 'var(--border)',
                input: 'var(--input)',
                ring: 'var(--ring)',

                // Your Custom Colors
                darkgreen: '#133307',
                green: '#90E274',
                lightgreen: '#B5EBA2',
                text: {
                    primary: '#000000',
                    secondary: '#1B6500',
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                card: '15px 0px 50px 10px rgba(0,0,0,0.2)',
                soft: '25px 25px 50px -12px rgba(0,0,0,0.1), -25px -25px 50px -12px rgba(0,0,0,0.1)',
                innerDarkgreen: 'inset 0 0 5px rgba(19,51,7,0.8)',
                innerGreen: 'inset 0 0 5px rgba(40,152,0,0.7)',
                innerRed: 'inset 0 0 5px rgba(242,115,115,0.7)',
                innerOrange: 'inset 0 0 8px rgba(78, 30, 0, 1)',
                innerBlue: 'inset 0 0 10px rgba(0, 36, 76, 1)'
            },
            keyframes: {
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            animation: {
                fadeIn: 'fadeIn 300ms ease-out forwards',
            },
        },
    },

    plugins: [forms, tailwindcssAnimate],
};