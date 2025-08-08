/**
 * Test utility functions for better test reliability and debugging
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Validates that test data files exist before running tests
 */
export function validateTestDataFiles(files: string[]): void {
  const missingFiles: string[] = [];
  
  for (const file of files) {
    const fullPath = resolve(__dirname, '..', file);
    if (!existsSync(fullPath)) {
      missingFiles.push(fullPath);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(
      `Test data files missing:\n${missingFiles.map(f => `  - ${f}`).join('\n')}\n` +
      'Please ensure all test data files are present before running tests.'
    );
  }
}

/**
 * Waits for a condition to be met with timeout and retries
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  {
    timeout = 5000,
    interval = 100,
    description = 'condition',
  }: {
    timeout?: number;
    interval?: number;
    description?: string;
  } = {}
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for ${description} after ${timeout}ms`);
}

/**
 * Enhanced promise wrapper with better error messages
 */
export function createTestPromise<T>(
  description: string,
  timeoutMs = 10000
): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} {
  let resolveFunc: (value: T) => void;
  let rejectFunc: (error: Error) => void;
  
  const promise = new Promise<T>((resolve, reject) => {
    resolveFunc = resolve;
    rejectFunc = reject;
    
    // Add timeout
    setTimeout(() => {
      reject(new Error(`Test promise "${description}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return {
    promise,
    resolve: resolveFunc!,
    reject: rejectFunc!,
  };
}

/**
 * Socket test helper with automatic cleanup
 */
export class SocketTestHelper {
  private sockets: any[] = [];
  
  addSocket(socket: any): void {
    this.sockets.push(socket);
  }
  
  async cleanup(): Promise<void> {
    await Promise.all(
      this.sockets.map(async socket => {
        try {
          if (socket.connected) {
            socket.disconnect();
          }
          // Wait for disconnect to complete
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.warn('Error cleaning up socket:', error);
        }
      })
    );
    this.sockets = [];
  }
}