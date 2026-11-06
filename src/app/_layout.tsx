import { useFonts } from "expo-font";
import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { SplashScreen, Stack } from "expo-router";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { posthog } from "../../lib/posthog";
import "../../global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file.");
}

function PostHogIdentity() {
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      identifiedUserId.current = undefined;
      return;
    }
    if (identifiedUserId.current === user.id) return;

    const properties: Record<string, string> = {};
    const email = user.primaryEmailAddress?.emailAddress;

    if (email) properties.email = email;
    if (user.fullName) properties.name = user.fullName;

    posthog?.identify(user.id, { $set: properties });
    identifiedUserId.current = user.id;
  }, [isLoaded, user]);

  return null;
}

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

  const app = (
    <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
      <PostHogIdentity />
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );

  return posthog ? (
    <PostHogProvider client={posthog}>
      <PostHogErrorBoundary>{app}</PostHogErrorBoundary>
    </PostHogProvider>
  ) : (
    app
  );
}
