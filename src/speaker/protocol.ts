/**
 * Names shared across the wire between the host console and its API.
 *
 * Kept apart from `src/server/speakerAuth.ts` because that module imports
 * `node:crypto` for the timing-safe comparison, and the console is a client
 * component — importing the header name from there would drag Node's crypto
 * into the browser bundle.
 */
export const PASSCODE_HEADER = "x-speaker-passcode";
