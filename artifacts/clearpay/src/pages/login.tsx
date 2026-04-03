import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}clearpay-logo.png`}
          alt="ClearPay Merchant Solutions"
          className="h-64 w-auto"
          style={{ filter: "invert(1) hue-rotate(180deg)" }}
        />
        <form onSubmit={handleSubmit} className="w-full space-y-6 bg-zinc-950 px-8 pt-6 pb-8 rounded-xl border border-zinc-800 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="rep@clearpay.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
                required
                data-testid="input-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-black font-semibold h-11"
            disabled={loading}
            data-testid="button-login"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center text-xs text-zinc-600 pt-2">
            <p>Admin: <span className="text-zinc-400">alex@clearpay.io</span> / <span className="text-zinc-400">admin@clearpay</span></p>
            <p className="mt-1">Rep: <span className="text-zinc-400">jordan@clearpay.io</span> / <span className="text-zinc-400">rep@clearpay</span></p>
          </div>
        </form>
      </div>
    </div>
  );
}
