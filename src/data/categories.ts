import type { Category } from '../types';
import raw from './categories.json';

// Source : « Glossaire alphabétique ensemble catégories » (MAJ 01-2026), docs/*.pdf.
export const categories = raw as unknown as Category[];

export const categoryByLabel = new Map<string, Category>(categories.map((c) => [c.label, c]));
