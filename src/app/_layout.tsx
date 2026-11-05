import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import "../../global.css";

export default function RootLayout() {
  const [fontLoaded] = useFonts({
    "sans-regular": require("../../assets/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-medium": require("../../assets/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../../assets/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-bold": require("../../assets/assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-extrabold": require("../../assets/assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "sans-light": require("../../assets/assets/fonts/PlusJakartaSans-Light.ttf"),
  });

  useEffect(() => {
    if (fontLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontLoaded]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
