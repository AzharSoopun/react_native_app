import { styled } from "nativewind";
import { useClerk, useUser } from "@clerk/expo";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { AuthError } from "../../../components/auth/AuthField";
import { posthog } from "../../../lib/posthog";
const SafeAreaView = styled(RNSafeAreaView);
const Settings = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setError("");
    try {
      await signOut();
      posthog?.logger.info("sign-out completed", { authentication_provider: "clerk" });
      posthog?.capture("sign_out_completed");
      posthog?.reset();
    } catch {
      setError("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="mb-4 text-xl font-bold">Settings</Text>
      <Text className="mb-5 text-base">{user?.primaryEmailAddress?.emailAddress ?? "Signed in"}</Text>
      <AuthError message={error} />
      <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-primary" onPress={handleSignOut} disabled={isSigningOut}>
        {isSigningOut ? <ActivityIndicator color="#fff" /> : <Text className="font-semibold text-white">Sign out</Text>}
      </Pressable>
    </SafeAreaView>
  );
};

export default Settings;
