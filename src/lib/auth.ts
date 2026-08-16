import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * What a person is told when their password is right but the account is not
 * usable yet. Written for the person reading it, not for the log.
 */
const ACCOUNT_STATE_MESSAGE: Record<string, string> = {
  PENDING:
    "Your account is waiting for approval. An administrator still needs to check your ID number.",
  REJECTED:
    "That request wasn't approved. Speak to the registrar if you think it should have been.",
  INACTIVE: "That account has been deactivated. Contact the registrar.",
  SUSPENDED: "That account is suspended. Contact the registrar.",
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Nothing here logs the email or the outcome. Sign-in attempts are
        // exactly the traffic you do not want landing in stdout.
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            studentProfile: true,
            supervisorRecord: { include: { workplace: true } },
          },
        });

        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);

        // The account state is only revealed once the password is right, so
        // this cannot be used to find out who has an account here.
        if (valid && user.status !== "ACTIVE") {
          throw new Error(ACCOUNT_STATE_MESSAGE[user.status] ?? ACCOUNT_STATE_MESSAGE.PENDING);
        }

        if (!valid) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 } },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentProfileId: user.studentProfile?.id ?? null,
          supervisorRecordId: user.supervisorRecord?.id ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentProfileId = user.studentProfileId;
        token.supervisorRecordId = user.supervisorRecordId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.studentProfileId = token.studentProfileId as string | null;
        session.user.supervisorRecordId = token.supervisorRecordId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.AUTH_SECRET,
};
