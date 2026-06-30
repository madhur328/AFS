import { describe, it, expect } from 'vitest';
import { injectSpiralBootParams } from './spiral-embed';

describe('spiral-embed', () => {
  it('injects boot params after body open for offline iframe', () => {
    const html = '<html><body><p>spiral</p></body></html>';
    const out = injectSpiralBootParams(html, { embed: '1', n: '4', res: '0.92' });
    expect(out).toContain('window.__AFS_SPIRAL_BOOT__=');
    expect(out).toContain('</script>');
    expect(out).toContain('"embed":"1"');
    expect(out.indexOf('__AFS_SPIRAL_BOOT__')).toBeLessThan(out.indexOf('<p>spiral</p>'));
  });
});