import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, AlertCircle } from "lucide-react";

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
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ClearPay</h1>
          <p className="text-gray-400 text-sm">Sales Command Center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-950 p-8 rounded-xl border border-zinc-800 shadow-2xl">
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
