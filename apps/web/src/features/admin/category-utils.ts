import type { AdminCategory } from './types';

/** Mirrors the catalog service slugify() so the form can preview generated slugs. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** IDs of `rootId` and all of its descendants (invalid parent choices when editing it). */
export function getDescendantIds(categories: AdminCategory[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    childrenByParent.set(category.parentId, [...(childrenByParent.get(category.parentId) ?? []), category.id]);
  }

  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    for (const childId of childrenByParent.get(queue.shift()!) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }
  return result;
}

export type CategoryStatusFilter = 'all' | 'active' | 'inactive';

export function filterCategories(
  categories: AdminCategory[],
  search: string,
  status: CategoryStatusFilter,
): AdminCategory[] {
  const term = search.trim().toLowerCase();
  return categories.filter((category) => {
    if (status === 'active' && !category.isActive) return false;
    if (status === 'inactive' && category.isActive) return false;
    if (!term) return true;
    return [category.name, category.slug, category.parent?.name]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  });
}
