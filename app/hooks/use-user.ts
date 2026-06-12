import { useRouteLoaderData } from "react-router";

import type { User } from "../auth.server";
// Type-only import — erased at compile time, so it creates no runtime
// dependency on the server module from this client-safe file.
import type { loader as rootLoader } from "../root";

/**
 * Access the authenticated user from anywhere in the component tree.
 *
 * Reads the `root` route's loader data, which React Router hoists to the top
 * of the tree and keeps in sync across navigations and revalidations. Because
 * the root loader always resolves a `User` (or throws), this hook is
 * guaranteed non-null in normal operation — the throw below is a defensive
 * guard for the "used outside the root route tree" programming error.
 *
 * @example
 *   function Header() {
 *     const user = useUser();
 *     return <span>{user.email}</span>;
 *   }
 */
export function useUser(): User {
  const data = useRouteLoaderData<typeof rootLoader>("root");

  if (!data?.user) {
    throw new Error(
      "useUser() found no user in the root loader. Ensure the component is " +
        "rendered within the root route tree and that root.tsx exports a " +
        "loader returning `{ user }`.",
    );
  }

  return data.user;
}
