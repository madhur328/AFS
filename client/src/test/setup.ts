import '@testing-library/jest-dom/vitest';

// Twemoji img onError handlers assume browser image loading
class MockImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

// @ts-expect-error test shim
globalThis.Image = MockImage;