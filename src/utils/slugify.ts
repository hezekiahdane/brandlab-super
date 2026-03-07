export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export const RESERVED_SLUGS = [
  'auth',
  'workspaces',
  'api',
  'share',
  'master',
  'my-work',
  '_next',
];
