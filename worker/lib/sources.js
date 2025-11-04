/**
 * Source management (approved, candidates, blocked)
 */

/**
 * Get all sources
 */
export async function getSources(env) {
  try {
    const approved = (await env.NEWS_KV.get('sources:approved', 'json')) || [];
    const candidates = (await env.NEWS_KV.get('sources:candidates', 'json')) || [];

    return { approved, candidates };
  } catch (error) {
    console.error('Failed to get sources:', error);
    return { approved: [], candidates: [] };
  }
}

/**
 * Add an approved source
 */
export async function addApprovedSource(url, env) {
  try {
    const sources = await getSources(env);

    // Remove from candidates if present
    sources.candidates = sources.candidates.filter(
      c => (typeof c === 'string' ? c : c.url) !== url
    );

    // Add to approved with timestamp
    const newSource = {
      url,
      approvedAt: new Date().toISOString(),
    };

    // Check if already approved
    const exists = sources.approved.some(s => (typeof s === 'string' ? s : s.url) === url);

    if (!exists) {
      sources.approved.push(newSource);
    }

    // Save both lists
    await env.NEWS_KV.put('sources:approved', JSON.stringify(sources.approved));
    await env.NEWS_KV.put('sources:candidates', JSON.stringify(sources.candidates));
  } catch (error) {
    console.error('Failed to add approved source:', error);
    throw error;
  }
}

/**
 * Add a candidate source
 */
export async function addCandidateSource(url, title, env) {
  try {
    const sources = await getSources(env);

    // Check if already in approved or candidates
    const inApproved = sources.approved.some(s => (typeof s === 'string' ? s : s.url) === url);
    const inCandidates = sources.candidates.some(c => (typeof c === 'string' ? c : c.url) === url);

    if (!inApproved && !inCandidates) {
      sources.candidates.push({
        url,
        title: title || new URL(url).hostname,
        discoveredAt: new Date().toISOString(),
      });

      await env.NEWS_KV.put('sources:candidates', JSON.stringify(sources.candidates));
    }
  } catch (error) {
    console.error('Failed to add candidate source:', error);
  }
}

/**
 * Block a domain
 */
export async function blockDomain(domain, env) {
  try {
    let blocked = (await env.NEWS_KV.get('settings:blocked_domains', 'json')) || [];

    if (!blocked.includes(domain)) {
      blocked.push(domain);
      await env.NEWS_KV.put('settings:blocked_domains', JSON.stringify(blocked));
    }

    // Remove from candidates and approved
    const sources = await getSources(env);

    sources.approved = sources.approved.filter(s => {
      const url = typeof s === 'string' ? s : s.url;
      try {
        return new URL(url).hostname !== domain;
      } catch {
        return true;
      }
    });

    sources.candidates = sources.candidates.filter(c => {
      const url = typeof c === 'string' ? c : c.url;
      try {
        return new URL(url).hostname !== domain;
      } catch {
        return true;
      }
    });

    await env.NEWS_KV.put('sources:approved', JSON.stringify(sources.approved));
    await env.NEWS_KV.put('sources:candidates', JSON.stringify(sources.candidates));
  } catch (error) {
    console.error('Failed to block domain:', error);
    throw error;
  }
}

/**
 * Check if a domain is blocked
 */
export async function isBlocked(domain, env) {
  try {
    const blocked = (await env.NEWS_KV.get('settings:blocked_domains', 'json')) || [];
    const envBlocked = (env.BLOCKLIST || '').split(',').map(d => d.trim());

    return blocked.includes(domain) || envBlocked.includes(domain);
  } catch {
    return false;
  }
}
