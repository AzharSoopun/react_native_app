import { Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import "../../../global.css";

const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <Text className="text-xl font-bold text-success">
        Welcome to Nativewind!
      </Text>
      <Link
        href="/onboarding"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        go to onboarding
      </Link>
      <Link
        href="/auth/sign-in"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        go to sign in
      </Link>
      <Link
        href="/auth/sign-up"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        go to sign up
      </Link>
      <Link href="../subscriptions/spotify">Spotify Subscription</Link>
      <Link
        href={{
          pathname: "../subscriptions/[id]",
          params: { id: "claude" },
        }}
      >
        claude max subscription
      </Link>
    </SafeAreaView>
  );
}
