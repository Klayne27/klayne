// src/lib/utils/hashtagUtils.js

/**
 * Extract unique lowercase hashtags from text.
 * e.g. "Hello #World #world #foo" → ["world", "foo"]
 */
export function extractHashtags(text) {
  if (!text) return [];
  const regex = /#([\p{L}\p{N}_]+)/gu;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1].toLowerCase()))];
}

/**
 * Persist hashtag count changes to the Hashtag collection.
 * @param {string[]} added   - tags to increment
 * @param {string[]} removed - tags to decrement (won't go below 0)
 */
export async function syncHashtagCounts(added = [], removed = []) {
  const Hashtag = (await import("../../models/hashtag.model.js")).default;

  const ops = [];

  for (const tag of added) {
    ops.push({
      updateOne: {
        filter: { tag },
        update: {
          $inc: { count: 1 },
          $set: { lastUsed: new Date() },
        },
        upsert: true,
      },
    });
  }

  for (const tag of removed) {
    ops.push({
      updateOne: {
        filter: { tag, count: { $gt: 0 } },
        update: { $inc: { count: -1 } },
      },
    });
  }

  if (ops.length) await Hashtag.bulkWrite(ops, { ordered: false });
}
