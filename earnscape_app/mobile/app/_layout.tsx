import { Stack } from "expo-router";
import "./global.css";
import "react-native-get-random-values";
import {useFonts} from "expo-font";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { GlobalProvider } from "@/lib/global-provider";
import { PrivyProvider } from "@privy-io/expo";
import { PrivyElements } from "@privy-io/expo/ui";
import * as Application from "expo-application";

console.log("Bundle ID at runtime:", Application.applicationId);
console.log("Privy appId:", process.env.EXPO_PUBLIC_PRIVY_APP_ID);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
  });

 useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
  <PrivyProvider
    appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID as string}
    clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID as string}
  >
    <PrivyElements />
    <GlobalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GlobalProvider>
  </PrivyProvider>
);
}