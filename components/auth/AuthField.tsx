import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

type AuthFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  isPassword?: boolean;
};

export function AuthField({ label, error, hint, isPassword, ...inputProps }: AuthFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = inputProps.nativeID ?? label.toLowerCase().replaceAll(" ", "-");

  return (
    <View className="auth-field">
      <Text nativeID={`${inputId}-label`} className="auth-label">
        {label}
      </Text>
      <View
        className={`auth-input-wrap ${
          error ? "border-destructive" : isFocused ? "border-accent" : "border-border"
        }`}
      >
        <TextInput
          {...inputProps}
          nativeID={inputId}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${inputId}-label`}
          accessibilityHint={hint}
          className="auth-input-control"
          placeholderTextColor="#777366"
          selectionColor="#ea7a53"
          secureTextEntry={isPassword ? !isPasswordVisible : inputProps.secureTextEntry}
          onFocus={(event) => {
            setIsFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            inputProps.onBlur?.(event);
          }}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            className="ml-2 min-h-11 min-w-11 items-center justify-center"
            hitSlop={8}
          >
            <Text className="text-xs font-sans-bold text-accent">
              {isPasswordVisible ? "Hide" : "Show"}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" className="auth-error">
          {error}
        </Text>
      ) : hint ? (
        <Text className="auth-helper">{hint}</Text>
      ) : null}
    </View>
  );
}

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function AuthButton({ title, onPress, disabled, loading }: AuthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      className={`auth-button ${disabled || loading ? "auth-button-disabled" : ""}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#081126" />
          <Text className="auth-button-text">Please wait…</Text>
        </View>
      ) : (
        <Text className="auth-button-text">{title}</Text>
      )}
    </Pressable>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
      <Text accessibilityRole="alert" className="text-sm font-sans-medium text-destructive">
        {message}
      </Text>
    </View>
  );
}

export function AuthFooterLink({
  prefix,
  label,
  onPress,
}: {
  prefix: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View className="auth-link-row">
      <Text className="auth-link-copy">{prefix}</Text>
      <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
        <Text className="auth-link">{label}</Text>
      </Pressable>
    </View>
  );
}
