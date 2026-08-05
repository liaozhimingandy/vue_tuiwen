export const config = {
    APP_BASE_URL: import.meta.env.VITE_APP_BASE_URL_APP || "https://tuiwen.alsoapp.com", //本app的URL
    API_BASE_URL: localStorage.getItem('CUSTOM_API_BASE_URL') || import.meta.env.VITE_APP_API_BASE_URL || "https://api.tuiwen.alsoapp.com", // 请求地址
    isDebug: import.meta.env.VITE_APP_IS_DEBUG  || false ,// 是否为开发环境
    NAME: "推文",
    THEME_COLOR: "#027AFF",
    BG_COLOR: "#E9EBEE"
};