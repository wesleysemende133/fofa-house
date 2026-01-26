import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthUser } from '@/types';

class AuthService {
  mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.email!.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
      role: user.user_metadata?.role || 'user',
    };
  }

  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async verifyOtpAndSetPassword(email: string, token: string, password: string, username: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username, role: 'user' },
    });
    if (updateError) throw updateError;

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ username })
      .eq('id', data.user!.id);
    
    if (profileError) console.error('Profile update error:', profileError);

    return data.user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }
}

export const authService = new AuthService();
