
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../../src/lib/auth-client";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { error } = await authClient.signIn.email({
                email: email.trim(),
                password,
                callbackURL: "/dashboard",
            });

            if (error) {
                setError(error.message || "Invalid email or password.");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#100B16] px-5 py-12 text-white">
            <div className="pointer-events-none absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-pink-500/10 blur-[130px]" />
            <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/15 blur-[140px]" />

            <div className="relative z-10 w-full max-w-md">
                <Link
                    href="/"
                    className="mb-10 block text-center text-2xl font-semibold tracking-tight"
                >
                    snap<span className="text-pink-400">.</span>to
                    <span className="text-violet-400">.</span>pay
                </Link>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
                    <div className="mb-8">
                        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-pink-300">
                            Seller account
                        </p>

                        <h1 className="text-3xl font-semibold tracking-tight">
                            Welcome back.
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-white/50">
                            Sign in to continue managing your sales.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm text-white/70">
                                Email address
                            </label>
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-400/10"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm text-white/70">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/10"
                            />
                        </div>

                        {error && (
                            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl bg-gradient-to-r from-pink-400 to-violet-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-white/50">
                        New to Snap to Pay?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-pink-300 transition hover:text-pink-200"
                        >
                            Create an account
                        </Link>
                    </p>
                </div>

                <p className="mt-7 text-center text-xs text-white/30">
                    Your business, one snap away.
                </p>
            </div>
        </main>
    );
}
