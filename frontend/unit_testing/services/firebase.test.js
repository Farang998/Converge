import { describe, it, expect, vi } from 'vitest';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ app: { name: 'test-app' } })),
  GoogleAuthProvider: vi.fn(function() { this.providerId = 'google.com'; }),
}));

describe('Firebase Service', () => {
  it('should export auth instance', async () => {
    const firebase = await import('../../src/services/firebase');
    expect(firebase.auth).toBeDefined();
  });

  it('should export googleProvider instance', async () => {
    const firebase = await import('../../src/services/firebase');
    expect(firebase.googleProvider).toBeDefined();
  });

  it('should initialize Firebase app with correct config', async () => {
    const { initializeApp } = await import('firebase/app');
    await import('../../src/services/firebase');
    
    expect(initializeApp).toHaveBeenCalled();
    const config = initializeApp.mock.calls[0][0];
    expect(config).toHaveProperty('apiKey');
    expect(config).toHaveProperty('authDomain');
    expect(config).toHaveProperty('projectId');
  });

  it('should have correct Firebase project configuration', async () => {
    const { initializeApp } = await import('firebase/app');
    await import('../../src/services/firebase');
    
    const config = initializeApp.mock.calls[0][0];
    expect(config.projectId).toBe('converge-d547c');
    expect(config.authDomain).toBe('converge-d547c.firebaseapp.com');
  });

  it('should initialize Google Auth Provider', async () => {
    const { GoogleAuthProvider } = await import('firebase/auth');
    await import('../../src/services/firebase');
    
    expect(GoogleAuthProvider).toHaveBeenCalled();
  });

  it('should initialize Firebase Auth', async () => {
    const { getAuth } = await import('firebase/auth');
    await import('../../src/services/firebase');
    
    expect(getAuth).toHaveBeenCalled();
  });
});
