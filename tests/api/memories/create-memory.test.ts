/*
import { NextRequest } from 'next/server';
import { handleApiMemoryPost } from '../../../src/app/api/memories/post';
import { db } from '@/db/db';
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock the auth function
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(),
}));

// Mock the s3-service
vi.mock('@/lib/s3-service', () => ({
  generateS3Key: vi.fn().mockReturnValue('mocked-s3-key'),
  generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://mocked-presigned-url'),
}));

describe('Memory Creation API', () => {
  const mockUserId = 'test-user-123';
  const mockMemoryId = 'test-memory-123';
  
  beforeAll(() => {
    // Mock the auth function to return a user ID
    const { auth } = vi.hoisted(() => ({
      auth: vi.fn(),
    }));

    vi.mock('@clerk/nextjs', () => ({
      auth,
    }));

    auth.mockImplementation(() => ({ userId: mockUserId }));
    
    // Mock the database insertion
    vi.spyOn(db, 'insert').mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: mockMemoryId,
        ownerId: mockUserId,
        title: 'Test Memory',
        status: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
      select: vi.fn(),
    } as any));
  });
  
  afterAll(() => {
    vi.clearAllMocks();
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should create a memory with files and return presigned URLs', async () => {
    // Create a mock request with file metadata
    const request = new NextRequest('http://localhost:3000/api/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Memory',
        description: 'A test memory',
        isPublic: false,
        files: [
          { name: 'test.jpg', type: 'image/jpeg', size: 1024 },
          { name: 'test2.jpg', type: 'image/jpeg', size: 2048 },
        ],
      }),
    });
    
    // Call the handler
    const response = await handleApiMemoryPost(request);
    const data = await response.json();
    
    // Assert the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.memoryId).toBe(mockMemoryId);
    expect(data.uploads).toHaveLength(2);
    expect(data.uploads[0]).toMatchObject({
      key: 'mocked-s3-key',
      url: 'https://mocked-presigned-url',
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024,
    });
  });
  
  it('should create a memory without files', async () => {
    // Create a mock request without files
    const request = new NextRequest('http://localhost:3000/api/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Memory',
        description: 'A test memory without files',
        isPublic: true,
      }),
    });
    
    // Call the handler
    const response = await handleApiMemoryPost(request);
    const data = await response.json();
    
    // Assert the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.memoryId).toBe(mockMemoryId);
    expect(data.status).toBe('active');
    expect(data.message).toBe('Memory created without files');
  });
  
  it('should return 401 for unauthenticated requests', async () => {
    // Mock auth to return no user
    const { auth } = vi.hoisted(() => ({
      auth: vi.fn(),
    }));

    vi.mock('@clerk/nextjs', () => ({
      auth,
    }));

    auth.mockImplementationOnce(() => ({ userId: null }));
    
    const request = new NextRequest('http://localhost:3000/api/memories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Unauthenticated Test',
      }),
    });
    
    const response = await handleApiMemoryPost(request);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
*/
