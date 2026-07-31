"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AccountLoginPage() {
  const [state, formAction, pending] = useActionState(signInCustomer, undefined);

  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&rsquo;t have an account?{" "}
          <Link
            href="/account/register"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
