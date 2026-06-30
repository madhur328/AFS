import type { Visualization } from './api';
import { fieldsMatchQuery } from './search-query';

export function fileNameFromPath(filePath: string | undefined): string {
  if (!filePath) return '';
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || '';
}

function fileStemFromPath(filePath: string | undefined): string {
  const base = fileNameFromPath(filePath);
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function visualizationSearchFields(v: Visualization): string[] {
  const stem = fileStemFromPath(v.path);
  return [
    v.title,
    v.path,
    fileNameFromPath(v.path),
    stem,
    stem.replace(/_/g, ' '),
    v.description,
    v.aspect_link,
    v.type,
  ];
}

export function visualizationMatches(v: Visualization, query: string): boolean {
  return fieldsMatchQuery(visualizationSearchFields(v), query);
}

export function filterVisualizations(items: Visualization[], query: string): Visualization[] {
  const q = query.trim();
  if (!q) return items;
  return items.filter((v) => visualizationMatches(v, q));
}