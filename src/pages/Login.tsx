import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

// MFA login state
const [mfaRequired, setMfaRequired] = useState(false);
const [mfaCode, setMfaCode] = useState("");
const [mfaFactorId, setMfaFactorId] = useState("");
  

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { data: signInData, error: signInError } =
  await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

if (signInError) {
  setError(signInError.message);
  setLoading(false);
  return;
}

const user = signInData.user;

const { data: profile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

if (profileError) {
  setError("Unable to load your account role.");
  setLoading(false);
  return;
}

// Drivers do not require MFA
if (profile.role === "driver") {
  setLoading(false);
  navigate("/");
  return;
}

// Parking owners and admins require MFA
if (
  profile.role === "parking_owner" ||
  profile.role === "admin"
) {
  const { data: factorsData, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError) {
    setError(factorsError.message);
    setLoading(false);
    return;
  }

  const verifiedTotp = factorsData.totp.find(
    (factor) => factor.status === "verified"
  );

  if (!verifiedTotp) {
    setError(
      "Two-factor authentication must be set up before accessing this account."
    );
    setLoading(false);
    return;
  }

  setMfaFactorId(verifiedTotp.id);
  setMfaRequired(true);
  setLoading(false);
  return;
}

setError("Invalid account role.");
setLoading(false);
  };

  const handleMfaVerify = async (
  event: FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setError("");

  const code = mfaCode.trim();

  if (!/^\d{6}$/.test(code)) {
    setError("Enter the 6-digit code from your authenticator app.");
    return;
  }

  if (!mfaFactorId) {
    setError("Authenticator factor was not found.");
    return;
  }

  setLoading(true);

  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({
      factorId: mfaFactorId,
    });

  if (challengeError) {
    setError(challengeError.message);
    setLoading(false);
    return;
  }

  const { error: verifyError } =
    await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challengeData.id,
      code,
    });

  if (verifyError) {
    setError(verifyError.message);
    setLoading(false);
    return;
  }

  setLoading(false);
  navigate("/");
};
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>
            Log in to your Ottawa Live Parking account.
          </CardDescription>
        </CardHeader>

        
          <CardContent>
  {mfaRequired ? (
    <form onSubmit={handleMfaVerify} className="space-y-4">
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

        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify and log in"}
      </Button>
    </form>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <div className="text-right">
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-foreground underline"
        >
          Forgot password?
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-foreground underline"
        >
          Create account
        </Link>
      </p>
    </form>
  )}

        </CardContent>
      </Card>
    </main>
  );
};

export default Login;