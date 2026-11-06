import { StatusBar } from "expo-status-bar";
import { styled } from "nativewind";
import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";
import { icons } from "../../constants/icon";

const SafeAreaView = styled(NativeSafeAreaView);

type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  return (
    <SafeAreaView className="auth-safe-area">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="auth-scroll"
          contentContainerClassName="grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="auth-content justify-center">
            <View className="auth-brand-block">
              <View className="auth-logo-wrap">
                <Image source={icons.logo} resizeMode="contain" className="size-14" />
                <View>
                  <Text className="auth-wordmark">Recurly</Text>
                  <Text className="auth-wordmark-sub">Smart billing</Text>
                </View>
              </View>
              <Text className="auth-title text-center">{title}</Text>
              <Text className="auth-subtitle">{subtitle}</Text>
            </View>

            <View className="auth-card">{children}</View>

            {footer}

            <Text className="mt-6 text-center text-xs font-sans-medium text-muted-foreground">
              Your subscriptions, all in one place.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthLoading() {
  return (
    <SafeAreaView className="auth-safe-area">
      <View className="flex-1 items-center justify-center">
        <Image source={icons.logo} resizeMode="contain" className="size-14" />
        <Text className="mt-3 font-sans-bold text-primary">Recurly</Text>
      </View>
    </SafeAreaView>
  );
}
