// NextAuth.js type extensions for ClaimFlow

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
      isActive?: boolean;
      twoFactorEnabled?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    image?: string | null;
    emailVerified?: Date | null;
    isActive?: boolean;
    twoFactorEnabled?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    emailVerified?: Date | null;
    isActive?: boolean;
    twoFactorEnabled?: boolean;
  }
}