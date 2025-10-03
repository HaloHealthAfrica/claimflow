// NextAuth.js configuration for ClaimFlow authentication
import NextAuth from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { userUtils } from '@/lib/db-utils';
import { auditLogger } from '@/lib/audit-logger';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Get client IP for audit logging
          const forwarded = req.headers?.['x-forwarded-for'];
          const ip = forwarded ? String(forwarded).split(',')[0] : req.headers?.['x-real-ip'] || 'unknown';

          // Find user by email
          const user = await userUtils.findByEmail(credentials.email);
          
          if (!user) {
            // Log failed login attempt
            await auditLogger.log({
              action: 'LOGIN_FAILED',
              entityType: 'User',
              ipAddress: String(ip),
              success: false,
              errorMessage: 'User not found',
            });
            return null;
          }

          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            await auditLogger.log({
              userId: user.id,
              action: 'LOGIN_BLOCKED',
              entityType: 'User',
              entityId: user.id,
              ipAddress: String(ip),
              success: false,
              errorMessage: 'Account locked',
            });
            return null;
          }

          // Check if account is active
          if (!user.isActive) {
            await auditLogger.log({
              userId: user.id,
              action: 'LOGIN_BLOCKED',
              entityType: 'User',
              entityId: user.id,
              ipAddress: String(ip),
              success: false,
              errorMessage: 'Account inactive',
            });
            return null;
          }

          // Verify password
          if (!user.password) {
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            // Increment failed login attempts
            await userUtils.incrementLoginAttempts(credentials.email, String(ip));
            return null;
          }

          // Update last login and reset failed attempts
          await userUtils.updateLastLogin(user.id, String(ip));

          // Return user object for session
          return {
            id: user.id,
            email: user.email,
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            twoFactorEnabled: user.twoFactorEnabled,
          };

        } catch (error) {
          console.error('Authentication error:', error);
          
          await auditLogger.log({
            action: 'LOGIN_ERROR',
            entityType: 'User',
            ipAddress: String(req.headers?.['x-forwarded-for'] || 'unknown'),
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
          
          return null;
        }
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
  
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
    secret: process.env.NEXTAUTH_SECRET,
  },
  
  pages: {
    signIn: '/login',
    signUp: '/signup',
    error: '/auth/error',
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phone = user.phone;
        token.emailVerified = user.emailVerified;
        token.isActive = user.isActive;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      
      // Return previous token if the access token has not expired yet
      return token;
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.phone = token.phone as string;
        session.user.emailVerified = token.emailVerified as Date;
        session.user.isActive = token.isActive as boolean;
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
      }
      
      return session;
    },
    
    async signIn({ user, account, profile }) {
      // Allow sign in
      return true;
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (user.id) {
        await auditLogger.log({
          userId: user.id,
          action: 'USER_SIGNIN',
          entityType: 'User',
          entityId: user.id,
          success: true,
        });
      }
    },
    
    async signOut({ session, token }) {
      if (token?.id) {
        await auditLogger.log({
          userId: token.id as string,
          action: 'USER_SIGNOUT',
          entityType: 'User',
          entityId: token.id as string,
          success: true,
        });
      }
    },
    
    async createUser({ user }) {
      await auditLogger.log({
        userId: user.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        success: true,
      });
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };