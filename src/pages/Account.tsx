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
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

    setError("");
    setSuccess(false);

    if (!email) {
      setError("Enter your new email address.");
      return;
    }

    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      setError("The new email must be different from your current email.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser(
      {
        email,
      },
      {
        emailRedirectTo: `${window.location.origin}/account`,
      }
    );

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setNewEmail("");
    setLoading(false);
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

              {success && (
                <Alert>
                  <AlertDescription>
                    Email change requested. Follow the confirmation
                    instructions sent by email to complete the change.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading}>
                {loading
                  ? "Sending confirmation..."
                  : "Change email"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Account;