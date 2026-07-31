"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpCustomer } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AccountRegisterPage() {
  const [state, formAction, pending] = useActionState(signUpCustomer, undefined);

  return (
    <div className="mx-auto grid min-h-screen max-w-sm place-items-center px-4 py-10">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
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
              minLength={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.info && <p className="text-sm text-muted-foreground">{state.info}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/account/login"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
