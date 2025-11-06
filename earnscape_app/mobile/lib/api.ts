import axios from "axios";
import { Platform } from "react-native";

// 1️⃣ Detect the backend base URL
// - iOS simulator can use localhost
// - Android emulator uses 10.0.2.2
// - Physical device: replace with your computer's LAN IP (e.g. 192.168.x.x)
const LOCAL_BASE_URL =
  Platform.OS === "ios"
    ? "http://localhost:4000"
    : "http://10.0.2.2:4000";

// 👇 replace with your actual LAN IP if testing on real phone
const LAN_BASE_URL = "http://192.168.110.89:4000";

// Toggle this depending on environment
const BASE_URL = __DEV__ ? LAN_BASE_URL : "http://192.168.110.89:4000";

// 2️⃣ Create the axios instance
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 3️⃣ Token helper (to attach Privy access token to all requests)
export const setAuthToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// 4️⃣ Simple debug log for clarity
console.log("🌐 API base URL:", BASE_URL);