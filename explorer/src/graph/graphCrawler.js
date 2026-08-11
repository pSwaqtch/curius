const CACHE_KEY = "curius_graph_cache";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

async function fetchUser(userLink, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api/users/${userLink}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch ${userLink}: ${res.status}`);
  const data = await res.json();
  return data.user;
}

async function fetchMe(token) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch("/api/user", { headers });
  if (!res.ok) throw new Error(`Failed to fetch /api/user: ${res.status}`);
  const data = await res.json();
  return data.user;
}

// Build nodes + edges from a cache map { userLink -> user }
function buildGraph(cache, rootUserLink) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  for (const [userLink, user] of Object.entries(cache)) {
    if (userLink === "__me__") continue;
    if (!seen.has(userLink)) {
      seen.add(userLink);
      nodes.push({
        id: userLink,
        label: `${user.firstName} ${user.lastName}`.trim() || userLink,
        isRoot: userLink === rootUserLink,
      });
    }
    for (const followed of user.followingUsers || []) {
      if (!seen.has(followed.userLink)) {
        seen.add(followed.userLink);
        nodes.push({
          id: followed.userLink,
          label: `${followed.firstName} ${followed.lastName}`.trim() || followed.userLink,
          isRoot: followed.userLink === rootUserLink,
        });
      }
      edges.push({ source: userLink, target: followed.userLink });
    }
  }

  return { nodes, edges };
}

// Crawl: fetch root user + their following (1 level deep)
// onProgress(fetched, total) called as requests complete
export async function crawlFromRoot(token, onProgress) {
  const cache = loadCache();

  // Fetch root user
  let me;
  if (cache["__me__"]) {
    me = cache["__me__"];
  } else {
    me = await fetchMe(token);
    cache["__me__"] = me;
    cache[me.userLink] = me;
    saveCache(cache);
  }

  const rootUserLink = me.userLink;
  const toFetch = (me.followingUsers || []).filter(
    (u) => !cache[u.userLink]
  );

  onProgress(0, toFetch.length);

  for (let i = 0; i < toFetch.length; i++) {
    const u = toFetch[i];
    try {
      const full = await fetchUser(u.userLink, token);
      cache[u.userLink] = full;
      saveCache(cache);
    } catch (e) {
      // store minimal data so we don't retry on reload
      cache[u.userLink] = { ...u, followingUsers: [] };
      saveCache(cache);
    }
    onProgress(i + 1, toFetch.length);
  }

  return { graph: buildGraph(cache, rootUserLink), rootUserLink };
}

// Expand a single node — fetch their following if not already cached
export async function expandNode(userLink, token, onProgress) {
  const cache = loadCache();

  if (!cache[userLink]) {
    onProgress(0, 1);
    const user = await fetchUser(userLink, token);
    cache[userLink] = user;
    saveCache(cache);
    onProgress(1, 1);
  }

  const me = cache["__me__"];
  const rootUserLink = me?.userLink || "";
  return { graph: buildGraph(cache, rootUserLink), rootUserLink };
}
