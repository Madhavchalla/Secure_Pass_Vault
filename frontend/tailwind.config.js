/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0f172a', /* Deep vault blue */
                accent: '#06b6d4', /* Glowing cyan */
            }
        },
    },
    plugins: [],
}
