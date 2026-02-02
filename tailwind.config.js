import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
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
                    'Segoe UI',
                    'Segoe UI Variable',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'sans-serif'],
            },
            colors: {
                darkgreen:'#133307',
                green: '#90E274',
                lightgreen: '#B5EBA2',


                text: {
                    primary: '#000000',
                    secondary: '#1B6500',
                }
            },
            boxShadow: {
                card: '15px 0px 50px 10px rgba(0,0,0,0.2)',
                soft: 
                '25px 25px 50px -12px rgba(0,0,0,0.1), -25px -25px 50px -12px rgba(0,0,0,0.1)'
            }
        },
    },

    plugins: [forms],
};
