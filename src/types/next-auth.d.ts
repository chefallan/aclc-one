import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      studentProfileId: string | null;
      supervisorRecordId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    role: string;
    studentProfileId: string | null;
    supervisorRecordId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    studentProfileId: string | null;
    supervisorRecordId: string | null;
  }
}
