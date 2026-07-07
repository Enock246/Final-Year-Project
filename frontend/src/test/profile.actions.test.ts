import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfile, completeProfile } from '../app/profile/actions';

// 1. Mock Next.js Cache & Navigation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// 2. Setup mock for Supabase Client
const mockUpsert = vi.fn();
const mockSingle = vi.fn();
const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockSingle });
const mockIlike = vi.fn().mockReturnValue({ limit: mockLimit });
const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike });
const mockFrom = vi.fn().mockImplementation((table) => {
  if (table === 'student_profiles') {
    return { upsert: mockUpsert };
  }
  if (table === 'students') {
    return { upsert: vi.fn().mockResolvedValue({ error: null }) };
  }
  return { select: mockSelect };
});

const mockGetUser = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// 3. Mock Fetch for Geocoding Fallback
global.fetch = vi.fn();

describe('Profile Actions Security Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
      },
      error: null,
    });
    
    // Default success for profile upsert
    mockUpsert.mockResolvedValue({ error: null });
  });

  describe('updateProfile', () => {
    it('should strip unauthorized fields (Mass Assignment Protection)', async () => {
      const maliciousPayload = {
        town_city: 'Accra',
        max_commute_minutes: 45,
        role: 'admin', // Malicious field
        verified: true, // Malicious field
      };

      const result = await updateProfile(maliciousPayload);

      expect(result.success).toBe(true);
      
      // Verify that `upsert` was called but WITHOUT `role` and `verified`
      expect(mockUpsert).toHaveBeenCalled();
      const upsertArgs = mockUpsert.mock.calls[0][0];
      
      expect(upsertArgs.town_city).toBe('Accra');
      expect(upsertArgs.max_commute_minutes).toBe(45);
      expect(upsertArgs.role).toBeUndefined();
      expect(upsertArgs.verified).toBeUndefined();
    });

    it('should fail cleanly on invalid payload types', async () => {
      const invalidPayload = {
        max_commute_minutes: 'should-be-a-number', // Invalid type
      };

      const result = await updateProfile(invalidPayload);

      expect(result.error).toBe('Invalid profile data provided');
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should sanitize database error messages to prevent leakage', async () => {
      // Force database to throw an error with sensitive info
      mockUpsert.mockResolvedValue({ 
        error: { message: 'Database error: relation "student_profiles" violates foreign key constraint "fk_test" on line 42' } 
      });

      const validPayload = { town_city: 'Kumasi' };
      const result = await updateProfile(validPayload);

      // The raw DB error should be swallowed, and a generic error returned
      expect(result.error).toBe('Failed to update profile');
    });
  });

  describe('completeProfile', () => {
    it('should strip unauthorized fields (Mass Assignment Protection)', async () => {
      const maliciousPayload = {
        transport_preference: 'PUBLIC',
        account_balance: 9999, // Malicious field
      };

      const result = await completeProfile(maliciousPayload);

      expect(result.success).toBe(true);
      
      const upsertArgs = mockUpsert.mock.calls[0][0];
      expect(upsertArgs.transport_preference).toBe('PUBLIC');
      expect(upsertArgs.account_balance).toBeUndefined();
    });
  });
});
