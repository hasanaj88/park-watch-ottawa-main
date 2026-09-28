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
      {
        email,
      },
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

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Account</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account and security settings.
          </p>
        </div>

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

              <Button
                type="submit"
                disabled={emailLoading}
              >
                {emailLoading
                  ? "Sending confirmation..."
                  : "Change email"}
              </Button>
            </form>
          </CardContent>
        </Card>

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
      </div>
    </main>
  );
};

export default Account;