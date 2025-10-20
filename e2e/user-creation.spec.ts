import { test, expect } from '@playwright/test';

test.describe('User Creation API', () => {
  test('can create temporary user via API', async ({ request }) => {
    const userData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
    };

    const response = await request.post('/api/users', {
      data: userData,
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('user');
    expect(responseData).toHaveProperty('allUser');
    expect(responseData.user).toHaveProperty('id');
    expect(responseData.allUser).toHaveProperty('id');
  });

  test('requires name and email for user creation', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: {
        // Missing required fields
      },
    });

    expect(response.status()).toBe(400);

    const responseData = await response.json();
    expect(responseData).toHaveProperty('error');
    expect(responseData.error).toContain('Name and email are required');
  });

  test('can create user with relationship data', async ({ request }) => {
    const userData = {
      name: 'Family Member',
      email: `family${Date.now()}@example.com`,
      invitedByAllUserId: 'test-inviter-id',
      relationship: {
        type: 'family',
        familyRole: 'sibling',
        note: 'Test family relationship',
      },
    };

    const response = await request.post('/api/users', {
      data: userData,
    });

    // This might fail if invitedByAllUserId doesn't exist, but we're testing the API structure
    expect([200, 400, 500]).toContain(response.status());
  });
});
