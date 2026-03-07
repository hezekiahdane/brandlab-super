/**
 * Extract @email mentions from comment text and match against workspace members.
 * Returns matched members (excluding the comment author).
 */
export function extractMentions(
  body: string,
  members: { user_id: string; email: string }[],
  authorUserId: string
): { userId: string; email: string }[] {
  const mentionRegex = /@([\w.+-]+@[\w.-]+\.\w+)/g;
  const mentioned = new Set<string>();

  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    mentioned.add(match[1].toLowerCase());
  }

  return members
    .filter(
      (m) =>
        mentioned.has(m.email.toLowerCase()) && m.user_id !== authorUserId
    )
    .map((m) => ({ userId: m.user_id, email: m.email }));
}
