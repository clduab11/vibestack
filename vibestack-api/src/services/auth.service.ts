import type { SupabaseClient } from '@supabase/supabase-js';
import type { User, Session, ApiResponse, Database } from '../types';

interface SignUpOptions {
  username?: string;
  displayName?: string;
}

interface OAuthData {
  provider: string;
  url: string;
}

interface MFAEnrollmentData {
  id: string;
  type: string;
  secret: string;
  uri: string;
  qr_code: string;
}

export class AuthService {
  private failedAttempts: Map<string, number> = new Map();
  private resetRequests: Map<string, number> = new Map();

  constructor(private supabase: SupabaseClient<Database>) {}

  async signUp(
    email: string,
    password: string,
    options?: SignUpOptions,
  ): Promise<ApiResponse<{ user: User; session: Session }>> {
    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
          },
        };
      }

      // Validate password strength
      if (!this.isValidPassword(password)) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters',
          },
        };
      }

      // Sign up with Supabase Auth
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already registered',
            },
          };
        }
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Signup succeeded but user/session missing');
      }

      // Create profile and avatar
      if (options?.username || options?.displayName) {
        try {
          await this.createUserProfile(data.user.id, {
            username: options.username || email.split('@')[0] || 'user',
            displayName: options.displayName,
          });

          await this.createUserAvatar(data.user.id);
        } catch (profileError) {
          // Rollback: delete profile if avatar creation fails
          await this.supabase.from('profiles').delete().eq('user_id', data.user.id);

          return {
            success: false,
            error: {
              code: 'SIGNUP_FAILED',
              message: 'Failed to complete signup',
            },
          };
        }
      }

      return {
        success: true,
        data: {
          user: data.user as User,
          session: data.session as Session,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: error instanceof Error ? error.message : 'Signup failed',
        },
      };
    }
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<ApiResponse<{ user: User; session: Session }>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Track failed attempts
        const attempts = this.failedAttempts.get(email) || 0;
        this.failedAttempts.set(email, attempts + 1);

        if (error.message.includes('Too many requests')) {
          return {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many login attempts',
            },
          };
        }

        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        };
      }

      // Clear failed attempts on successful login
      this.failedAttempts.delete(email);

      return {
        success: true,
        data: {
          user: data.user as User,
          session: data.session as Session,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SIGNIN_ERROR',
          message: error instanceof Error ? error.message : 'Sign in failed',
        },
      };
    }
  }

  async signOut(): Promise<ApiResponse<void>> {
    try {
      await this.supabase.auth.signOut();

      // Always return success to clear local state
      return { success: true };
    } catch (error) {
      // Still return success to ensure local state is cleared
      return { success: true };
    }
  }

  async resetPassword(email: string): Promise<ApiResponse<void>> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return {
          success: false,
          error: {
            code: 'INVALID_EMAIL',
            message: 'Invalid email format',
          },
        };
      }

      // Check rate limit
      const lastRequest = this.resetRequests.get(email);
      const now = Date.now();
      if (lastRequest && now - lastRequest < 60000) {
        // 1 minute
        return {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Please wait before requesting another reset',
          },
        };
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env['APP_URL'] || 'http://localhost:3000'}/reset-password`,
      });

      if (error) {
        throw error;
      }

      // Track request time
      this.resetRequests.set(email, now);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: error instanceof Error ? error.message : 'Reset failed',
        },
      };
    }
  }

  async updatePassword(newPassword: string): Promise<ApiResponse<void>> {
    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await this.supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Must be authenticated',
          },
        };
      }

      // Validate password strength
      if (!this.isValidPassword(newPassword)) {
        return {
          success: false,
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters',
          },
        };
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Update failed',
        },
      };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User | null; session: Session | null }>> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      return {
        success: true,
        data: {
          user: user as User | null,
          session: session as Session | null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get user',
        },
      };
    }
  }

  async refreshSession(): Promise<ApiResponse<{ session: Session }>> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        if (error.message.includes('expired')) {
          return {
            success: false,
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Session expired, please sign in again',
            },
          };
        }
        throw error;
      }

      if (!data.session) {
        return {
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Session expired, please sign in again',
          },
        };
      }

      return {
        success: true,
        data: { session: data.session },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: error instanceof Error ? error.message : 'Refresh failed',
        },
      };
    }
  }

  async signInWithOAuth(provider: 'google' | 'apple'): Promise<ApiResponse<OAuthData>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env['APP_URL'] || 'http://localhost:3000'}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data as OAuthData,
      };
    } catch (error) {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      return {
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message: `Failed to authenticate with ${providerName}`,
        },
      };
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void): {
    unsubscribe: () => void;
  } {
    const { data } = this.supabase.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => {
        data.subscription?.unsubscribe();
      },
    };
  }

  async validateSession(): Promise<ApiResponse<{ valid: boolean; reason?: string }>> {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        return {
          success: true,
          data: { valid: false, reason: 'no_session' },
        };
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at < now) {
        return {
          success: true,
          data: { valid: false, reason: 'expired' },
        };
      }

      return {
        success: true,
        data: { valid: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
        },
      };
    }
  }

  async enrollMFA(type: 'totp'): Promise<ApiResponse<MFAEnrollmentData>> {
    try {
      const { data, error } = await (this.supabase.auth as any).mfa.enroll({
        factorType: type,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data as MFAEnrollmentData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MFA_ENROLL_ERROR',
          message: error instanceof Error ? error.message : 'MFA enrollment failed',
        },
      };
    }
  }

  async verifyMFA(code: string): Promise<ApiResponse<{ verified: boolean }>> {
    try {
      const { error } = await (this.supabase.auth as any).mfa.verify({
        factorId: 'current',
        code,
      });

      if (error) {
        if (error.message.includes('Invalid code')) {
          return {
            success: false,
            error: {
              code: 'INVALID_MFA_CODE',
              message: 'Invalid verification code',
            },
          };
        }
        throw error;
      }

      return {
        success: true,
        data: { verified: true },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MFA_VERIFY_ERROR',
          message: error instanceof Error ? error.message : 'MFA verification failed',
        },
      };
    }
  }

  getFailedAttempts(email: string): number {
    return this.failedAttempts.get(email) || 0;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  private async createUserProfile(
    userId: string,
    data: { username: string; displayName?: string },
  ): Promise<void> {
    const { error } = await this.supabase.from('profiles').insert({
      user_id: userId,
      username: data.username,
      display_name: data.displayName || data.username,
      privacy_settings: {
        profile_visibility: 'public',
        show_activity: true,
        allow_friend_requests: true,
        show_stats: true,
      },
      notification_preferences: {
        email_notifications: true,
        push_notifications: true,
        friend_requests: true,
        habit_reminders: true,
        achievement_alerts: true,
        social_interactions: true,
      },
    });

    if (error) {
      throw error;
    }
  }

  private async createUserAvatar(userId: string): Promise<void> {
    const { error } = await this.supabase.from('avatars').insert({
      user_id: userId,
      name: 'My Avatar',
      personality_traits: {
        encouragement_style: 'cheerful',
        communication_frequency: 'medium',
        humor_level: 5,
        formality: 5,
      },
      appearance: {
        body_type: 'athletic',
        skin_tone: '#F5DEB3',
        hair_style: 'medium',
        hair_color: '#4B0082',
        outfit_id: 'default',
        accessories: [],
      },
      level: 1,
      experience: 0,
      mood: 80,
      energy: 100,
    });

    if (error) {
      throw error;
    }
  }
}
