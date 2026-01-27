import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/en/sign-in",
    error: "/en/sign-in",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Allow linking accounts with the same email
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase()),
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        // Check if user has a password set
        if (!user.password) {
          // Check if user has a Google account linked
          const googleAccount = await db.query.accounts.findFirst({
            where: and(
              eq(accounts.userId, user.id),
              eq(accounts.provider, "google")
            ),
          });

          if (googleAccount) {
            throw new Error("GOOGLE_ACCOUNT_EXISTS");
          }

          throw new Error("Please set a password for your account");
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth sign-ins, check if we need to link accounts
      if (account?.provider === "google" && user.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email.toLowerCase()),
        });

        if (existingUser) {
          // Check if Google account is already linked
          const existingAccount = await db.query.accounts.findFirst({
            where: and(
              eq(accounts.userId, existingUser.id),
              eq(accounts.provider, "google")
            ),
          });

          if (!existingAccount) {
            // Link the Google account to the existing user
            await db.insert(accounts).values({
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            });

            // Update user info from Google if missing
            if (!existingUser.image && profile?.picture) {
              await db
                .update(users)
                .set({ 
                  image: profile.picture as string,
                  name: existingUser.name || profile.name,
                })
                .where(eq(users.id, existingUser.id));
            }
          }
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      if (user) {
        token.id = user.id;
      }
      
      // Handle session updates
      if (trigger === "update" && session) {
        token.name = session.name;
        token.picture = session.image;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
