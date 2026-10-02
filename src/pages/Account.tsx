import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Account = () => {
  const [user, setUser] = useState<User | null>(null);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Phone verification state
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  // MFA / Authenticator state
const [mfaFactorId, setMfaFactorId] = useState("");
const [mfaQrCode, setMfaQrCode] = useState("");
const [mfaCode, setMfaCode] = useState("");
const [mfaLoading, setMfaLoading] = useState(false);
const [mfaError, setMfaError] = useState("");
const [mfaSuccess, setMfaSuccess] = useState(false);
const [mfaStep, setMfaStep] = useState<"idle" | "verify">("idle");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleEmailChange = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const email = newEmail.trim();

    setEmailError("");
    setEmailSuccess(false);

    if (!email) {
      setEmailError("Enter your new email address.");
      return;
    }

    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError(
        "The new email must be different from your current email."
      );
      return;
    }

    setEmailLoading(true);

    const { error: updateError } = await supabase.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${window.location.origin}/account`,
      }
    );

    if (updateError) {
      setEmailError(updateError.message);
      setEmailLoading(false);
      return;
    }

    setEmailSuccess(true);
    setNewEmail("");
    setEmailLoading(false);
  };

  const handlePasswordChange = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setPasswordError(updateError.message);
      setPasswordLoading(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess(true);
    setPasswordLoading(false);
  };

  const handleSendPhoneOtp = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const localPhone = phone.replace(/\D/g, "");
const normalizedPhone = `+1${localPhone}`;

    setPhoneError("");
    setPhoneSuccess(false);

    if (!/^\d{10}$/.test(localPhone)) {
  setPhoneError("Enter a valid 10-digit Canadian phone number.");
  return;
}

const verifiedPhone = user?.phone?.replace(/\D/g, "") ?? "";

if (verifiedPhone === `1${localPhone}`) {
  setPhoneError("This phone number is already verified.");
  return;

}
    setPhoneLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      phone: normalizedPhone,
    });

    if (updateError) {
      setPhoneError(updateError.message);
      setPhoneLoading(false);
      return;
    }

    setPhoneStep("otp");
    setPhoneLoading(false);
  };

  const handleVerifyPhoneOtp = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const localPhone = phone.replace(/\D/g, "");
const normalizedPhone = `+1${localPhone}`;
const token = phoneOtp.trim();
    

    setPhoneError("");
    setPhoneSuccess(false);

    if (!/^\d{6}$/.test(token)) {
      setPhoneError("Enter the 6-digit verification code.");

      return;
    }

    setPhoneLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token,
      type: "phone_change",
    });

    if (verifyError) {
      setPhoneError(verifyError.message);
      setPhoneLoading(false);
      return;
    }

    const { data, error: userError } =
      await supabase.auth.getUser();

    if (userError) {
      setPhoneError(userError.message);
      setPhoneLoading(false);
      return;
    }

        setUser(data.user);
    setPhone("");
    setPhoneOtp("");
    setPhoneStep("phone");
    setPhoneSuccess(true);
    setPhoneLoading(false);
  };

  // MFA Enrollment
  const handleEnableMfa = async () => {
    setMfaError("");
    setMfaSuccess(false);
    setMfaLoading(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Ottawa Live Parking",
    });

    if (error) {
      setMfaError(error.message);
      setMfaLoading(false);
      return;
    }
    setMfaFactorId(data.id);
    setMfaQrCode(data.totp.qr_code);
    setMfaStep("verify");
    setMfaLoading(false);
  };

  // Verify MFA code
  const handleVerifyMfa = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMfaError("");
    setMfaSuccess(false);

    const code = mfaCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setMfaError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    if (!mfaFactorId) {
      setMfaError("Authenticator setup was not started.");
      return;
    }

    setMfaLoading(true);

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

    if (challengeError) {
      setMfaError(challengeError.message);
      setMfaLoading(false);
      return;
    }

    const { error: verifyError } =
      await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code,
      });

    if (verifyError) {
      setMfaError(verifyError.message);
      setMfaLoading(false);
      return;
    }

    setMfaCode("");
    setMfaSuccess(true);
    setMfaLoading(false);
  };

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account and security settings.
          </p>
        </div>

        {/* Email */}
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>
              Manage the email address associated with your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Current email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>

            <form
              onSubmit={handleEmailChange}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="newEmail">New email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(event) =>
                    setNewEmail(event.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </div>

              {emailSuccess && (
                <Alert>
                  <AlertDescription>
                    Email change requested. Follow the confirmation
                    instructions sent by email to complete the change.
                  </AlertDescription>
                </Alert>
              )}

              {emailError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {emailError}
                  </AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={emailLoading}>
                {emailLoading
                  ? "Sending confirmation..."
                  : "Change email"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change the password used to sign in to your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handlePasswordChange}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {passwordSuccess && (
                <Alert>
                  <AlertDescription>
                    Your password has been changed successfully.
                  </AlertDescription>
                </Alert>
              )}

              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {passwordError}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={passwordLoading}
              >
                {passwordLoading
                  ? "Changing password..."
                  : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Phone verification */}
        <Card>
          <CardHeader>
            <CardTitle>Phone verification</CardTitle>
            <CardDescription>
              Add and verify a mobile number to strengthen your
              account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {user?.phone && (
              <div className="space-y-2">
                <Label>Verified phone</Label>
                <Input value={user.phone} disabled />
              </div>
            )}

            {phoneStep === "phone" ? (
              <form
                onSubmit={handleSendPhoneOtp}
                className="space-y-4"
              >
                <div className="space-y-2">
  <Label htmlFor="phone">
    Mobile phone
  </Label>

  <div className="flex">
    <div className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">
      +1
    </div>

    <Input
      id="phone"
      type="tel"
      inputMode="numeric"
      value={phone}
      onChange={(event) =>
        setPhone(
          event.target.value
            .replace(/\D/g, "")
            .slice(0, 10)
        )
      }
      placeholder="6135551234"
      autoComplete="tel-national"
      className="rounded-l-none"
      maxLength={10}
      required
    />
  </div>

  <p className="text-sm text-muted-foreground">
    Enter your 10-digit Canadian mobile number.
  </p>
</div>
                {phoneSuccess && (
                  <Alert>
                    <AlertDescription>
                      Your phone number has been verified
                      successfully.
                    </AlertDescription>
                  </Alert>
                )}

                {phoneError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {phoneError}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={phoneLoading}
                >
                  {phoneLoading
                    ? "Sending code..."
                    : user?.phone
                      ? "Change phone"
                      : "Send verification code"}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={handleVerifyPhoneOtp}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="phoneOtp">
                    Verification code
                  </Label>

                  <Input
                    id="phoneOtp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={phoneOtp}
                    onChange={(event) =>
                      setPhoneOtp(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                  />

                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to {phone}.
                  </p>
                </div>

                {phoneError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {phoneError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={phoneLoading}
                  >
                    {phoneLoading
                      ? "Verifying..."
                      : "Verify phone"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={phoneLoading}
                    onClick={() => {
                      setPhoneStep("phone");
                      setPhoneOtp("");
                      setPhoneError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                      </form>
            )}
          </CardContent>
        </Card>

        {/* MFA / Authenticator */}
        <Card>
          <CardHeader>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>
              Protect your account with an authenticator app.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {mfaStep === "idle" ? (
              <Button
                type="button"
                onClick={handleEnableMfa}
                disabled={mfaLoading}
              >
                {mfaLoading
                  ? "Preparing authenticator..."
                  : "Set up authenticator"}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code using Google Authenticator,
                  Microsoft Authenticator, or another TOTP app.
                </p>

                               {mfaQrCode && (
                  <img
                    src={mfaQrCode}
                    alt="Authenticator QR code"
                    className="h-48 w-48 rounded-md border bg-white p-2"
                  />
                )}

                <form
                  onSubmit={handleVerifyMfa}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">
                      Authenticator code
                    </Label>

                    <Input
                      id="mfaCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(event) =>
                        setMfaCode(
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6)
                        )
                      }
                      placeholder="6-digit code"
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={mfaLoading}
                  >
                    {mfaLoading
                      ? "Verifying..."
                      : "Verify and enable MFA"}
                  </Button>
                </form>

                {mfaSuccess && (
                  <Alert>
                    <AlertDescription>
                      Two-factor authentication has been enabled successfully.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {mfaError && (
              <Alert variant="destructive">
                <AlertDescription>{mfaError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Account;