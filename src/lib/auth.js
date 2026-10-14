import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { client } from "./db";

/**
 * Better Auth server instance. Google is the only sign-in method.
 * The MongoDB adapter needs no schema generation. Passing `client` would
 * enable transactions, which require a replica set, so it is left out.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL].filter(Boolean),
  database: mongodbAdapter(client.db()),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [nextCookies()], // must be the last plugin
});
