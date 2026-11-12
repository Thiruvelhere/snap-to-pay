import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },

    trustedOrigins: [
        process.env.APP_BASE_URL || "http://localhost:3000",
    ],
});