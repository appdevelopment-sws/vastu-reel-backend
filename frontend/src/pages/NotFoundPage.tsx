import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight">404</h1>
      <h2 className="mt-2 text-lg font-bold text-foreground">Page Not Found</h2>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        The cosmic coordinates you requested do not exist or have been relocated.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
      >
        <Home className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
