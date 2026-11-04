import { Text, View } from "react-native";

import { Link } from "expo-router";

const signUp = () => {
  return (
    <View>
      <Text>sign-up</Text>
      <Link href="/(auth)/sign-up">Sign In</Link>
    </View>
  );
};

export default signUp;
