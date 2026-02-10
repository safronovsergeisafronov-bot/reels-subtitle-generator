const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";
const _rawWsUrl = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000";
const WS_URL = _rawWsUrl.replace(/^https:\/\//, "wss://").replace(/^http:\/\//, "ws://");
const BASE_URL = API_URL.replace(/\/api$/, '');

export { API_URL, WS_URL, BASE_URL };
