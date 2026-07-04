"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const result = await signIn("ldap", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciales invalidas");
    } else {
      router.push("/app/inbox");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#003160" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>
            leadsGuadalupana
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6b7280" }}>
            Inicia sesion con tu cuenta corporativa
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg p-3 text-sm font-medium text-white" style={{ background: "#cf2e2e" }}>
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#464646" }}>
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#464646" }}>
            Contrasena
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#cf2e2e" }}
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
