// tailwind.config.js
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    plugins: [
        require('@tailwindcss/typography'), // 启用 Typography 插件
    ],
    // 启用 JIT 模式（Tailwind v3 必需）
    mode: 'jit'
}