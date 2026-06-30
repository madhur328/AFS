import { vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockApi } from './test/mockApi';
import { KERNEL_ROUTE_MANIFEST } from './generated/kernel-routes';

vi.mock('./lib/api', () => ({ api: mockApi }));
vi.mock('./lib/staticApi', () => ({
  isStaticMode: () => false,
  isStaticMobileMode: () => false,
}));

import App from './App';

/** Smoke routes — sourced from kernel manifest, not hand-maintained */
const ROUTES = KERNEL_ROUTE_MANIFEST.map((r) => ({
  path: r.path,
  expectText: new RegExp(r.testHeading),
}));

describe('App routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('kernel manifest covers all unfolded modules', () => {
    expect(KERNEL_ROUTE_MANIFEST.length).toBeGreaterThanOrEqual(18);
    expect(KERNEL_ROUTE_MANIFEST.every((r) => r.symbol.includes('🍁'))).toBe(true);
  });

  it.each(ROUTES)('renders $path without crashing', async ({ path, expectText }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        const heading = screen.getByRole('heading', { name: expectText });
        expect(heading).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    expect(document.body.textContent).not.toMatch(/Cannot reach AFS API/);
    expect(document.body.textContent).not.toMatch(/Unhandled Runtime Error/i);
  });
});