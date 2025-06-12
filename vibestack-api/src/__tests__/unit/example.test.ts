import { describe, it, expect } from 'vitest';

describe('Example Test Suite', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should demonstrate async testing', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });

  it('should demonstrate error testing', () => {
    const throwError = (): void => {
      throw new Error('Test error');
    };

    expect(throwError).toThrow('Test error');
  });
});

