/**
 * Server-only identity helpers.
 *
 * Identity is established at the edge by Traefik's ForwardAuth middleware
 * (Google OAuth). Once a request reaches this SSR backend it is *already*
 * authenticated, and the authenticated email is injected as a trusted header:
 *
 *     X-Forwarded-User: jane.doe@paramify.com
 *
 * The `.server.ts` suffix ensures this module (and its secrets/logic) is
 * tree-shaken out of the client bundle by the React Router compiler.
 */

/** Header Traefik's ForwardAuth proxy injects after a successful OAuth flow. */
const FORWARDED_USER_HEADER = "X-Forwarded-User";

/** Stand-in identity for local dev, where Traefik isn't in the request path. */
const DEV_FALLBACK_EMAIL = "local-dev@paramify.com";

/** The authenticated user as known to the application. */
export interface User {
  email: string;
}

/**
 * Resolve the current user from the incoming request.
 *
 * - **Production:** reads the trusted `X-Forwarded-User` header set by Traefik.
 *   If it's missing, the request somehow bypassed the auth proxy (proxy
 *   misconfiguration or a direct hit) — we fail closed with a 401 rather than
 *   silently serving an anonymous session.
 * - **Development:** falls back to a mock identity so the app is fully usable
 *   without standing up the proxy locally.
 *
 * `Headers.get` is case-insensitive, so header casing differences are a non-issue.
 *
 * @throws {Response} 401 in production when the identity header is absent.
 */
export function getUser(request: Request): User {
  const forwardedUser = request.headers.get(FORWARDED_USER_HEADER)?.trim();

  if (forwardedUser) {
    return { email: forwardedUser };
  }

  if (process.env.NODE_ENV === "development") {
    return { email: DEV_FALLBACK_EMAIL };
  }

  // Fail closed: in production the proxy guarantees this header.
  throw new Response("Unauthorized: missing forwarded identity.", {
    status: 401,
    statusText: "Unauthorized",
  });
}
