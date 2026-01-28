'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <Button disabled>Loading...</Button>;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome, {user.name || user.email}
        </span>
        <Button asChild variant="outline">
          <a href="/api/auth/logout">Logout</a>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild>
      <a href="/api/auth/login">Login</a>
    </Button>
  );
}