/**
 * Trends tracking and analysis
 */

/**
 * Update the current hourly bucket with new items
 */
export async function updateTrendsBucket(items, env) {
  const now = new Date();
  const bucketKey = getBucketKey(now);

  try {
    // Get existing bucket or create new
    let bucket = await env.NEWS_KV.get(`trends:${bucketKey}`, 'json');

    if (!bucket) {
      bucket = {
        bucket: bucketKey,
        data: {
          sources: {},
          tags: {},
        },
      };
    }

    // Count sources and tags
    items.forEach(item => {
      // Count source
      const source = item.source || 'Unknown';
      bucket.data.sources[source] = (bucket.data.sources[source] || 0) + 1;

      // Count tags
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          bucket.data.tags[tag] = (bucket.data.tags[tag] || 0) + 1;
        });
      }
    });

    // Store updated bucket (expires after 7 days)
    await env.NEWS_KV.put(`trends:${bucketKey}`, JSON.stringify(bucket), {
      expirationTtl: 7 * 24 * 60 * 60,
    });
  } catch (error) {
    console.error('Failed to update trends bucket:', error);
  }
}

/**
 * Get trends buckets for the last N hours
 */
export async function getTrendsBuckets(env, hours = 24) {
  const buckets = [];
  const now = new Date();

  for (let i = 0; i < hours; i++) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const bucketKey = getBucketKey(time);

    try {
      const bucket = await env.NEWS_KV.get(`trends:${bucketKey}`, 'json');

      if (bucket) {
        buckets.push(bucket);
      } else {
        // Empty bucket
        buckets.push({
          bucket: bucketKey,
          data: {
            sources: {},
            tags: {},
          },
        });
      }
    } catch (error) {
      console.error(`Failed to get bucket ${bucketKey}:`, error);
    }
  }

  // Reverse to get chronological order
  return buckets.reverse();
}

/**
 * Get bucket key for a given time (ISO hour format)
 */
function getBucketKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:00:00Z`;
}

/**
 * Get top N items from a counts object
 */
export function getTopN(counts, n = 5) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
}
