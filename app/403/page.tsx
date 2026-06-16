/**
 * 403 — Access Denied Page
 */

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <svg className="h-10 w-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">403 — Access Denied</h1>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
