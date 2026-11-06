import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AuthButton, AuthError, AuthField, AuthFooterLink } from "../../../components/auth/AuthField";
import { AuthScreen } from "../../../components/auth/AuthScreen";
import { getClerkErrorMessage, getCodeError, getPasswordError, maskEmailAddress, validateEmail, type AuthFieldErrors } from "../../../lib/auth-validation";
import { useResendCooldown } from "../../../lib/use-resend-cooldown";
import { posthog } from "../../../lib/posthog";

type FactorStrategy = "email_code" | "phone_code" | "totp" | "backup_code" | "passkey";
type SignInStep =
  | "credentials"
  | "factor"
  | "reset-email"
  | "reset-code"
  | "reset-new-password";
type FactorContext = "first" | "mfa";

const factorLabels: Record<FactorStrategy, string> = {
  email_code: "Email code",
  phone_code: "Text message code",
  totp: "Authenticator app",
  backup_code: "Backup code",
  passkey: "Passkey",
};

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<SignInStep>("credentials");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [factorContext, setFactorContext] = useState<FactorContext>("mfa");
  const [factorStrategy, setFactorStrategy] = useState<FactorStrategy>("email_code");
  const [factorOptions, setFactorOptions] = useState<FactorStrategy[]>([]);
  const [localErrors, setLocalErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const isSubmittingRef = useRef(false);
  const { secondsRemaining, startCooldown, resetCooldown } = useResendCooldown();
  const isBusy = fetchStatus === "fetching";

  const clearFeedback = () => {
    setFormError("");
    setNotice("");
  };

  const setFieldError = (field: keyof AuthFieldErrors, message?: string) => {
    setLocalErrors((current) => ({ ...current, [field]: message ?? "" }));
  };

  const finishSignIn = async () => {
    const { error } = await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setFormError("Your sign-in needs one more account step before you can continue. Please contact support.");
          return;
        }
        posthog?.logger.info("sign-in completed", { authentication_provider: "clerk" });
        posthog?.capture("sign_in_completed");
        router.replace("/(tabs)");
      },
    });
    if (error) setFormError(getClerkErrorMessage(error, "We couldn’t finish signing you in. Please try again."));
  };

  const finishIfComplete = async () => {
    if (signIn.status === "complete") {
      await finishSignIn();
      return true;
    }
    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      const available = signIn.supportedSecondFactors
        .map((factor) => factor.strategy)
        .filter((strategy) => ["email_code", "phone_code", "totp", "backup_code", "passkey"].includes(strategy)) as FactorStrategy[];
      await beginFactorChallenge(available, "mfa");
      return true;
    }
    if (signIn.status === "needs_first_factor") {
      const available = signIn.supportedFirstFactors
        .map((factor) => factor.strategy)
        .filter((strategy) => strategy === "email_code" || strategy === "phone_code") as FactorStrategy[];
      if (available.length) {
        await beginFactorChallenge(available, "first");
        return true;
      }
    }
    if (signIn.status === "needs_new_password") {
      setStep("reset-email");
      setFormError("For your security, reset your password before signing in.");
      return true;
    }
    return false;
  };

  const beginFactorChallenge = async (available: FactorStrategy[], context: FactorContext) => {
    const preferred: FactorStrategy[] = ["email_code", "phone_code", "totp", "backup_code"];
    const orderedOptions = preferred.filter((strategy) => available.includes(strategy));
    if (!orderedOptions.length) {
      setFormError("We couldn’t complete this sign-in method. Try again or reset your password.");
      return;
    }
    setFactorOptions(orderedOptions);
    setFactorContext(context);
    setCode("");
    clearFeedback();
    await selectFactor(orderedOptions[0], context);
  };

  const selectFactor = async (strategy: FactorStrategy, context = factorContext) => {
    setFactorStrategy(strategy);
    setCode("");
    resetCooldown();
    clearFeedback();
    if (strategy !== "email_code" && strategy !== "phone_code") return;

    const { error } = context === "first"
      ? strategy === "email_code"
        ? await signIn.emailCode.sendCode()
        : await signIn.phoneCode.sendCode()
      : strategy === "email_code"
        ? await signIn.mfa.sendEmailCode()
        : await signIn.mfa.sendPhoneCode();

    if (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t send a verification code. Please try again."));
      return;
    }
    startCooldown();
  };

  const handlePasswordSignIn = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const emailError = validateEmail(emailAddress);
    const passwordError = password ? undefined : "Enter your password.";
    setLocalErrors({ emailAddress: emailError, password: passwordError });
    clearFeedback();
    if (emailError || passwordError) return;

    isSubmittingRef.current = true;
    try {
      const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
      if (error) {
        setFormError(getClerkErrorMessage(error, "We couldn’t sign you in. Check your details and try again."));
        return;
      }
      if (!(await finishIfComplete())) {
        setFormError("We couldn’t complete this sign-in. Try again or reset your password.");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "A connection issue interrupted sign-in. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleVerifyFactor = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const value = code.trim();
    const isBackupCode = factorStrategy === "backup_code";
    const codeError = factorStrategy === "passkey"
      ? undefined
      : !value
      ? "Enter your verification code."
      : !isBackupCode && !/^[0-9\s-]{4,12}$/.test(value)
        ? "Check the code and try again."
        : undefined;
    setFieldError("code", codeError);
    clearFeedback();
    if (codeError) return;

    isSubmittingRef.current = true;
    try {
      const { error } = factorContext === "first"
        ? factorStrategy === "email_code"
          ? await signIn.emailCode.verifyCode({ code: value })
          : await signIn.phoneCode.verifyCode({ code: value })
        : factorStrategy === "email_code"
          ? await signIn.mfa.verifyEmailCode({ code: value })
          : factorStrategy === "phone_code"
            ? await signIn.mfa.verifyPhoneCode({ code: value })
            : factorStrategy === "totp"
              ? await signIn.mfa.verifyTOTP({ code: value })
              : factorStrategy === "backup_code"
                ? await signIn.mfa.verifyBackupCode({ code: value })
                : await signIn.mfa.passkey();

      if (error) {
        setFormError(getClerkErrorMessage(error, "That code didn’t work. Check it and try again."));
        return;
      }
      if (!(await finishIfComplete())) {
        setFormError("We couldn’t complete verification. Try another method or start again.");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t verify that code. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleResendFactorCode = async () => {
    if (secondsRemaining > 0 || isSubmittingRef.current || fetchStatus === "fetching") return;
    isSubmittingRef.current = true;
    clearFeedback();
    try {
      const { error } = factorContext === "first"
        ? factorStrategy === "email_code"
          ? await signIn.emailCode.sendCode()
          : await signIn.phoneCode.sendCode()
        : factorStrategy === "email_code"
          ? await signIn.mfa.sendEmailCode()
          : await signIn.mfa.sendPhoneCode();
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

  const handleResendResetCode = async () => {
    if (secondsRemaining > 0 || isSubmittingRef.current || fetchStatus === "fetching") return;
    isSubmittingRef.current = true;
    clearFeedback();
    try {
      const { error } = await signIn.resetPasswordEmailCode.sendCode();
      if (error) {
        setFormError(getClerkErrorMessage(error, "We couldn’t send another reset code. Please try again."));
        return;
      }
      startCooldown();
      setNotice("A new code is on its way.");
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t send another reset code. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleStartPasswordReset = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const emailError = validateEmail(emailAddress);
    setFieldError("emailAddress", emailError);
    clearFeedback();
    if (emailError) {
      setStep("reset-email");
      return;
    }

    isSubmittingRef.current = true;
    try {
      await signIn.reset();
      const { error: createError } = await signIn.create({ identifier: emailAddress.trim() });
      if (createError) {
        setFormError(getClerkErrorMessage(createError, "We couldn’t start a password reset. Check your email and try again."));
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setFormError(getClerkErrorMessage(sendError, "We couldn’t send a reset code. Check your email and try again."));
        return;
      }
      setStep("reset-code");
      setCode("");
      startCooldown();
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t start a password reset. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleVerifyResetCode = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const codeError = getCodeError(code);
    setFieldError("code", codeError);
    clearFeedback();
    if (codeError) return;
    isSubmittingRef.current = true;
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (error) {
        setFormError(getClerkErrorMessage(error, "That reset code didn’t work. Check it and try again."));
        return;
      }
      setStep("reset-new-password");
      setLocalErrors({});
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t verify that reset code. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleSetNewPassword = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    const passwordError = getPasswordError(newPassword);
    const confirmError = confirmNewPassword !== newPassword ? "Your passwords don’t match." : undefined;
    setLocalErrors({ password: passwordError, confirmPassword: confirmError });
    clearFeedback();
    if (passwordError || confirmError) return;
    isSubmittingRef.current = true;
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (error) {
        setFormError(getClerkErrorMessage(error, "We couldn’t update your password. Choose a different password and try again."));
        return;
      }
      posthog?.capture("password_reset_completed");
      if (!(await finishIfComplete())) {
        setFormError("Your password was updated, but we couldn’t finish sign-in. Please sign in with your new password.");
      }
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t update your password. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleBackToCredentials = async () => {
    if (isSubmittingRef.current || fetchStatus === "fetching") return;
    isSubmittingRef.current = true;
    try {
      await signIn.reset();
      resetCooldown();
      setStep("credentials");
      setCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setLocalErrors({});
      clearFeedback();
    } catch (error) {
      setFormError(getClerkErrorMessage(error, "We couldn’t restart sign-in. Please try again."));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const titleByStep: Record<SignInStep, string> = {
    credentials: "Welcome back",
    factor: "Verify it’s you",
    "reset-email": "Reset your password",
    "reset-code": "Check your email",
    "reset-new-password": "Choose a new password",
  };
  const subtitleByStep: Record<SignInStep, string> = {
    credentials: "Sign in to continue managing your subscriptions.",
    factor: factorStrategy === "email_code"
      ? "Enter the code we sent to your email."
      : factorStrategy === "phone_code"
        ? "Enter the code we sent by text message."
        : factorStrategy === "totp"
          ? "Enter the code from your authenticator app."
          : factorStrategy === "backup_code"
            ? "Enter one of your saved backup codes."
            : "Use a passkey saved to this device to verify your sign-in.",
    "reset-email": "We’ll email you a secure code to reset your password.",
    "reset-code": `Enter the reset code we sent to ${maskEmailAddress(emailAddress)}.`,
    "reset-new-password": "Use a password you haven’t used before.",
  };

  const footer = step === "credentials"
    ? <AuthFooterLink prefix="New to Recurly?" label="Create an account" onPress={() => router.push("/auth/sign-up")} />
    : step === "reset-email" || step === "reset-code" || step === "reset-new-password"
      ? <AuthFooterLink prefix="Remembered your password?" label="Sign in" onPress={handleBackToCredentials} />
      : <AuthFooterLink prefix="Need a different account?" label="Start over" onPress={handleBackToCredentials} />;

  return (
    <AuthScreen title={titleByStep[step]} subtitle={subtitleByStep[step]} footer={footer}>
      <View className="auth-form">
        {(step === "credentials" || step === "reset-email") && (
          <>
            <AuthField
              label="Email"
              value={emailAddress}
              onChangeText={(value) => {
                setEmailAddress(value);
                setFieldError("emailAddress", undefined);
                setFormError("");
              }}
              error={localErrors.emailAddress ?? errors.fields.identifier?.message}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            {step === "credentials" && (
              <>
                <View className="flex-row justify-end">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      clearFeedback();
                      setStep("reset-email");
                    }}
                    hitSlop={8}
                  >
                    <Text className="text-xs font-sans-bold text-accent">Forgot password?</Text>
                  </Pressable>
                </View>
                <AuthField
                  label="Password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setFieldError("password");
                    setFormError("");
                  }}
                  error={localErrors.password ?? errors.fields.password?.message}
                  placeholder="Enter your password"
                  isPassword
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordSignIn}
                />
              </>
            )}
          </>
        )}

        {step === "factor" && (
          <>
            {factorStrategy !== "passkey" && <AuthField
              label={factorLabels[factorStrategy]}
              value={code}
              onChangeText={(value) => {
                setCode(value);
                setFieldError("code");
                setFormError("");
              }}
              error={localErrors.code ?? errors.fields.code?.message}
              placeholder={factorStrategy === "backup_code" ? "Enter a backup code" : "Enter your code"}
              keyboardType={factorStrategy === "backup_code" ? "default" : "number-pad"}
              autoCapitalize={factorStrategy === "backup_code" ? "characters" : "none"}
              autoCorrect={false}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={handleVerifyFactor}
            />}
            {(factorStrategy === "email_code" || factorStrategy === "phone_code") && (
              <Pressable
                accessibilityRole="button"
                onPress={handleResendFactorCode}
                disabled={secondsRemaining > 0 || isBusy}
                className="self-start py-1"
              >
                <Text className={`text-sm font-sans-semibold text-accent ${secondsRemaining > 0 || isBusy ? "opacity-50" : ""}`}>
                  {secondsRemaining > 0 ? `Send a new code in ${secondsRemaining}s` : "Send a new code"}
                </Text>
              </Pressable>
            )}
            {factorOptions.length > 1 && (
              <View className="mt-1">
                <Text className="auth-helper mb-2">Try another method</Text>
                <View className="flex-row flex-wrap gap-2">
                  {factorOptions.filter((option) => option !== factorStrategy).map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      onPress={() => selectFactor(option)}
                      disabled={isBusy}
                      className="rounded-full border border-border px-3 py-2"
                    >
                      <Text className="text-xs font-sans-semibold text-primary">{factorLabels[option]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {step === "reset-code" && (
          <>
            <AuthField
              label="Reset code"
              value={code}
              onChangeText={(value) => {
                setCode(value.replace(/[^0-9]/g, "").slice(0, 6));
                setFieldError("code");
                setFormError("");
              }}
              error={localErrors.code ?? errors.fields.code?.message}
              placeholder="6-digit code"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerifyResetCode}
            />
            <Pressable
              accessibilityRole="button"
              onPress={handleResendResetCode}
              disabled={secondsRemaining > 0 || isBusy}
              className="self-start py-1"
            >
              <Text className={`text-sm font-sans-semibold text-accent ${secondsRemaining > 0 || isBusy ? "opacity-50" : ""}`}>
                {secondsRemaining > 0 ? `Send a new code in ${secondsRemaining}s` : "Send a new code"}
              </Text>
            </Pressable>
          </>
        )}

        {step === "reset-new-password" && (
          <>
            <AuthField
              label="New password"
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                setFieldError("password");
                setFormError("");
              }}
              error={localErrors.password ?? errors.fields.password?.message}
              hint="Use at least 8 characters."
              placeholder="Create a new password"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <AuthField
              label="Confirm new password"
              value={confirmNewPassword}
              onChangeText={(value) => {
                setConfirmNewPassword(value);
                setFieldError("confirmPassword");
                setFormError("");
              }}
              error={localErrors.confirmPassword}
              placeholder="Enter your new password again"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSetNewPassword}
            />
          </>
        )}

        <AuthError message={formError} />
        {!!notice && <Text className="text-sm font-sans-medium text-success">{notice}</Text>}

        <AuthButton
          title={
            step === "credentials" ? "Sign in"
              : step === "factor" ? factorStrategy === "passkey" ? "Continue with passkey" : "Verify and continue"
                : step === "reset-email" ? "Send reset code"
                  : step === "reset-code" ? "Verify code"
                    : "Save new password"
          }
          onPress={
            step === "credentials" ? handlePasswordSignIn
              : step === "factor" ? handleVerifyFactor
                : step === "reset-email" ? handleStartPasswordReset
                  : step === "reset-code" ? handleVerifyResetCode
                    : handleSetNewPassword
          }
          loading={isBusy}
        />

        {step !== "credentials" && step !== "reset-email" && (
          <Pressable accessibilityRole="button" onPress={handleBackToCredentials} disabled={isBusy} className="items-center py-2">
            <Text className="auth-helper">Back to sign in</Text>
          </Pressable>
        )}
      </View>
    </AuthScreen>
  );
}
