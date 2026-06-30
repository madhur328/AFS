const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  toStaticVisualizationMediaUrl,
  enrichVisualizationsForStatic,
} = require('../scripts/lib/static-viz-media');

const ROOT = path.join(__dirname, '..');

describe('static viz media paths', () => {
  it('resolves project videos/afs path to relative URL', () => {
    const abs = path.join(ROOT, 'videos', 'afs', 'Red Leaf.mp4');
    const url = toStaticVisualizationMediaUrl(abs, ROOT);
    assert.equal(url, 'videos/afs/Red%20Leaf.mp4');
  });

  it('resolves images under videos/afs/images', () => {
    const abs = path.join(ROOT, 'videos', 'afs', 'images', '8.jpg');
    const url = toStaticVisualizationMediaUrl(abs, ROOT);
    assert.equal(url, 'videos/afs/images/8.jpg');
  });

  it('excludes engine rows from static export', () => {
    const abs = path.join(ROOT, 'enthea-rs.exe');
    const { rows } = enrichVisualizationsForStatic(
      [
        { id: 6, type: 'engine', title: 'ENTHEA Live', path: abs },
        { id: 1, type: 'video', title: 'Red Leaf', path: path.join(ROOT, 'videos', 'afs', 'Red Leaf.mp4') },
      ],
      ROOT
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'video');
    assert.equal(rows[0].title, 'Red Leaf');
  });

  it('enriches visualization rows with media_url', () => {
    const abs = path.join(ROOT, 'videos', 'afs', 'AFS Synthesis.mp4');
    const { rows } = enrichVisualizationsForStatic(
      [{ id: 1, type: 'video', title: 'AFS Synthesis', path: abs }],
      ROOT
    );
    assert.ok(rows[0].media_url?.includes('videos/afs'));
    assert.equal(rows[0].media_offline, false);
  });
});