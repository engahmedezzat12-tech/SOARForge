'use client';

export function SignOutButton() {
  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.href = '/sign-in';
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground"
    >
      Sign out
    </button>
  );
}
