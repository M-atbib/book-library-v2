import { auth } from "$lib/services/firebase";
import { goto } from "$app/navigation";
import { browser } from "$app/environment";

export type RouteGuard = {
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
  publicOnly?: boolean;
};

export const guards: Record<string, RouteGuard> = {
  // Public-only routes (logged-in users can't access)
  "/": {
    publicOnly: true,
    redirectTo: "/books",
  },
  "/register": {
    publicOnly: true,
    redirectTo: "/books",
  },

  // Protected routes that require authentication
  "/books": {
    requireAuth: true,
    redirectTo: "/",
  },
  "/books/[id]": {
    requireAuth: true,
    redirectTo: "/",
  },
  "/profile": {
    requireAuth: true,
    redirectTo: "/",
  },
};

export async function checkRouteAccess(path: string): Promise<boolean> {
  const guard =
    Object.entries(guards)
      .filter(([route]) => {
        const pattern = route.replace(/\[.*?\]/g, "[^/]+");
        return new RegExp(`^${pattern}/?$`).test(path);
      })
      .sort(([a], [b]) => b.length - a.length)[0]?.[1] ?? {};

  // Wait for auth state to be ready
  await new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      resolve();
    });
  });

  const user = auth.currentUser;

  // Handle public-only routes (like login page)
  if (guard.publicOnly) {
    if (user) {
      if (browser) {
        goto(guard.redirectTo || "/books");
      }
      return false;
    }
    return true;
  }

  // Handle protected routes
  if (guard.requireAuth) {
    if (!user) {
      if (browser) {
        goto(guard.redirectTo || "/");
      }
      return false;
    }

    // Check roles using custom claims instead of Firestore
    if (guard.allowedRoles) {
      const token = await user.getIdTokenResult();
      const userRole = token.claims.role;
      console.log("User role:", userRole);

      if (!userRole || !guard.allowedRoles.includes(userRole as string)) {
        if (browser) {
          goto("/books");
        }
        return false;
      }
    }
  }

  return true;
}
