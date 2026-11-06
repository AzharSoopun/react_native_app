import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthButton, AuthError, AuthField, AuthFooterLink } from "../../../components/auth/AuthField";
import { AuthScreen } from "../../../components/auth/AuthScreen";
import { getClerkErrorMessage, getCodeError, getPasswordError, maskEmailAddress, validateEmail, type AuthFieldErrors } from "../../../lib/auth-validation";
import { useResendCooldown } from "../../../lib/use-resend-cooldown";

type SignUpStep = "details" | "verify-email";

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const [step, setStep] = useState<SignUpStep>("details");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [localErrors, setLocalErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const isSubmittingRef = useRef(false);
  const { secondsRemaining, startCooldown, resetCooldown } = useResendCooldown();
  const isBusy = fetchStatus === "fetching";

  const setFieldError = (field: keyof AuthFieldErrors, message?: string) => {
    setLocalErrors((current) => ({ ...current, [field]: message ?? "" }));
  };

  const finishSignUp = async () => {
    const { error } = await signUp.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setFormError("Your account needs one more security step before it’s ready. Please try again or contact support.");
          return;
        }
        router.replace("/(tabs)");
      },
    });
    if (error) setFormError(getClerkErrorMessage(error, "We couldn’t finish setting up your account. Please try again."));
  };

  const handleCreateAccount = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const emailError = validateEmail(emailAddress);
    const passwordError = getPasswordError(password);
    const confirmError = confirmPassword !== password ? "Your passwords don’t match." : undefined;
    setLocalErrors({ emailAddress: emailError, password: passwordError, confirmPassword: confirmError });
    setFormError("");
    setNotice("");
    if (emailError || passwordError || confirmError) return;

    isSubmittingRef.current = true;
    try {
      const { error } = await signUp.password({
        emailAddress: emailAddress.trim(),
        password,
      });
      if (error) {
        setFormError(getClerkErrorMessage(error, "We couldn’t create your account. Check your details and try again."));
        return;
      }

      if (signUp.status === "complete") {
        await finishSignUp();
        return;
      }

      if (signUp.unverifiedFields.includes("email_address")) {
        const { error: sendError } = await signUp.verifications.sendEmailCode();
        if (sendError) {
          setFormError(getClerkErrorMessage(sendError, "We couldn’t send your verification code. Please try again."));
          return;
        }
        setStep("verify-email");
        setCode("");
        startCooldown();
        return;
      }

      setFormError("We need a little more information to finish creating your account. Please contact support.");
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "A connection issue interrupted sign-up. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleVerifyEmail = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const codeError = getCodeError(code);
    setFieldError("code", codeError);
    setFormError("");
    setNotice("");
    if (codeError) return;

    isSubmittingRef.current = true;
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (error) {
        setFormError(getClerkErrorMessage(error, "That code didn’t work. Check it and try again."));
        return;
      }
      if (signUp.status === "complete") {
        await finishSignUp();
      } else {
        setFormError("Your email is verified, but your account needs another setup step. Please contact support.");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t verify that code. Check your connection and try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleResendCode = async () => {
    if (secondsRemaining > 0 || isSubmittingRef.current || fetchStatus === "fetching") return;
    isSubmittingRef.current = true;
    setFormError("");
    setNotice("");
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) {
        setFormError(getClerkErrorMessage(error, "We couldn’t send another code. Please try again."));
        return;
      }
      startCooldown();
      setNotice("A new code is on its way.");
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t send another code. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleBackToDetails = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    isSubmittingRef.current = true;
    try {
      await signUp.reset();
      resetCooldown();
      setStep("details");
      setCode("");
      setFormError("");
      setNotice("");
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t restart sign-up. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const subtitle = step === "verify-email"
    ? `Enter the 6-digit code we sent to ${maskEmailAddress(emailAddress)}.`
    : "Sign up to keep every recurring payment under control.";

  return (
    <AuthScreen
      title={step === "verify-email" ? "Check your email" : "Create your account"}
      subtitle={subtitle}
      footer={
        step === "details" ? (
          <AuthFooterLink prefix="Already have an account?" label="Sign in" onPress={() => router.push("/auth/sign-in")} />
        ) : (
          <AuthFooterLink prefix="Already verified?" label="Sign in" onPress={() => router.replace("/auth/sign-in")} />
        )
      }
    >
      <View className="auth-form">
        {step === "details" ? (
          <>
            <AuthField
              label="Email"
              value={emailAddress}
              onChangeText={(value) => {
                setEmailAddress(value);
                setFieldError("emailAddress");
                setFormError("");
              }}
              error={localErrors.emailAddress ?? errors.fields.emailAddress?.message}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <AuthField
              label="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setFieldError("password");
                setFormError("");
              }}
              error={localErrors.password ?? errors.fields.password?.message}
              hint="Use at least 8 characters."
              placeholder="Create a password"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            <AuthField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                setFieldError("confirmPassword");
                setFormError("");
              }}
              error={localErrors.confirmPassword}
              placeholder="Enter your password again"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleCreateAccount}
            />
            <AuthError message={formError} />
            <AuthButton title="Create account" onPress={handleCreateAccount} loading={isBusy} />
            <View nativeID="clerk-captcha" />
          </>
        ) : (
          <>
            <Text className="auth-helper text-center">
              We sent a verification code to your inbox. It may take a minute to arrive.
            </Text>
            <AuthField
              label="Verification code"
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                setFieldError("code");
                setFormError("");
              }}
              error={localErrors.code ?? errors.fields.code?.message}
              placeholder="6-digit code"
              keyboardType="number-pad"
              autoCapitalize="none"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyEmail}
            />
            <AuthError message={formError} />
            {!!notice && <Text accessibilityRole="text" className="text-center text-sm font-sans-medium text-success">{notice}</Text>}
            <AuthButton title="Verify email" onPress={handleVerifyEmail} loading={isBusy} />
            <Pressable
              accessibilityRole="button"
              onPress={handleResendCode}
              disabled={secondsRemaining > 0 || isBusy}
              className="auth-secondary-button"
            >
              <Text className={`auth-secondary-button-text ${secondsRemaining > 0 || isBusy ? "opacity-50" : ""}`}>
                {secondsRemaining > 0 ? `Send a new code in ${secondsRemaining}s` : "Send a new code"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleBackToDetails} disabled={isBusy} className="items-center py-2">
              <Text className="auth-helper">Change email address</Text>
            </Pressable>
          </>
        )}
      </View>
    </AuthScreen>
  );
}
