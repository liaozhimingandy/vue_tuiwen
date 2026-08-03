export const config = {
    APP_BASE_URL: import.meta.env.VITE_APP_BASE_URL_APP || "https://tuiwen.alsoapp.com", //本app的URL
    API_BASE_URL: import.meta.env.VITE_APP_API_BASE_URL, // 请求地址
    isDebug: import.meta.env.VITE_APP_IS_DEBUG  // 是否为开发环境
};