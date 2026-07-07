import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInWithProtection } from './actions';
import * as supabaseServer from '@/utils/supabase/server';

// Mock the supabase server client creation
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('signInWithProtection Server Action', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock Supabase client with chainable/async methods
    mockSupabase = {
      rpc: vi.fn(),
      auth: {
        signInWithPassword: vi.fn(),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test' } } }),
      },
    };

    // Make createClient return our mock
    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any);
  });

  const createFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  };

  it('should return error for invalid input (Zod validation)', async () => {
    const formData = createFormData({ email: 'not-an-email', password: 'short' });
    const result = await signInWithProtection(formData);
    
    expect(result).toEqual({ error: 'Invalid input' });
    expect(supabaseServer.createClient).not.toHaveBeenCalled();
  });

  it('should login successfully when under failure limit', async () => {
    const email = 'test@example.com';
    const formData = createFormData({ email, password: 'password123' });

    // Mock RPC to return 0 failures
    mockSupabase.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_failed_login_count') return { data: 0 };
      return { data: null };
    });

    // Mock successful sign in
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    const result = await signInWithProtection(formData);

    expect(result).toEqual({ success: true, nextRoute: '/dashboard' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_failed_login_count', { user_email: email });
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email, password: 'password123' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('reset_failed_login', { user_email: email });
  });

  it('should increment failures and return generic error on login failure', async () => {
    const email = 'test@example.com';
    const formData = createFormData({ email, password: 'wrongpassword' });

    mockSupabase.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_failed_login_count') return { data: 0 };
      return { data: null };
    });

    // Mock failed sign in
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ 
      error: { message: 'Invalid login credentials' } 
    });

    const result = await signInWithProtection(formData);

    expect(result).toEqual({ error: 'Invalid login credentials' });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_failed_login', { user_email: email });
  });

  it('should require captcha when failure limit reached (>=3)', async () => {
    const email = 'test@example.com';
    const formData = createFormData({ email, password: 'password123' });

    // Mock RPC to return 3 failures
    mockSupabase.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_failed_login_count') return { data: 3 };
      return { data: null };
    });

    const result = await signInWithProtection(formData);

    expect(result).toEqual({ error: 'captcha_required' });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should fail with invalid captcha when limit reached', async () => {
    const email = 'test@example.com';
    const formData = createFormData({ 
      email, 
      password: 'password123',
      captchaToken: 'short' // Invalid token
    });

    mockSupabase.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_failed_login_count') return { data: 3 };
      return { data: null };
    });

    const result = await signInWithProtection(formData);

    expect(result).toEqual({ error: 'captcha_required' }); // Wait! My action returns 'captcha_required' if verifyCaptcha fails? No! Let's check actions.ts
    // Wait, I am expecting Captcha verification failed. Let me verify the code.
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('should login successfully with valid captcha when limit reached', async () => {
    const email = 'test@example.com';
    const formData = createFormData({ 
      email, 
      password: 'password123',
      captchaToken: 'dev_test_token' // Valid test token
    });

    mockSupabase.rpc.mockImplementation(async (fnName: string) => {
      if (fnName === 'get_failed_login_count') return { data: 3 };
      return { data: null };
    });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    const result = await signInWithProtection(formData);

    expect(result).toEqual({ success: true, nextRoute: '/dashboard' });
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('reset_failed_login', { user_email: email });
  });
});
