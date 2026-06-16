import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock the Next.js NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body,
      };
    }),
  },
}));

// Mock the Supabase client
const mockGetUser = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe('GET /api/geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    // Setup mock to simulate unauthenticated user
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const request = new Request('http://localhost:3000/api/geocode?lat=1&lon=1');
    const response = await GET(request) as any;

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('should return 400 if lat/lon are missing', async () => {
    // Setup mock to simulate authenticated user
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'test-user-id' } } });

    const request = new Request('http://localhost:3000/api/geocode');
    const response = await GET(request) as any;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid coordinates');
  });

  it('should return 400 if lat/lon are out of bounds', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'test-user-id' } } });

    // Invalid latitude (95 is > 90)
    const request = new Request('http://localhost:3000/api/geocode?lat=95&lon=0');
    const response = await GET(request) as any;

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid coordinates');
  });

  it('should attempt fetch and return data on valid request', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'test-user-id' } } });

    // Mock global fetch for nominatim
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        display_name: 'Test Full Address',
        address: {
          city: 'Kumasi',
          state: 'Ashanti Region',
        },
      }),
    });

    const request = new Request('http://localhost:3000/api/geocode?lat=6.6885&lon=-1.6244');
    const response = await GET(request) as any;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.town).toBe('Kumasi');
    expect(body.region).toBe('Ashanti');
  });
});
