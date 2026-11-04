import { Text, View } from "react-native";

import { Link } from "expo-router";

const signIn = () => {
  return (
    <View>
      <Text>sign-in</Text>
      <Link href="/(auth)/sign-up">Create Account</Link>
    </View>
  );
};

export default signIn;
