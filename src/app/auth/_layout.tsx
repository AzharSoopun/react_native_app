import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { AuthLoading } from "../../../components/auth/AuthScreen";
import "../../../global.css";

export default function RootLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
