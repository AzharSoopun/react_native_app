import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { AuthLoading } from "../../components/auth/AuthScreen";

export default function OnboardingRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return <Redirect href={isSignedIn ? "/(tabs)" : "/auth/sign-up"} />;
}
