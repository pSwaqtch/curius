import { BASE_URL } from "./endpoints";

// Build a nested object from dotted key paths, e.g. "highlight.text" -> { highlight: { text: val } }
function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function coerce(value, type) {
  if (value === "" || value === undefined) return undefined;
  if (type === "number") return Number(value);
  if (type === "boolean") return value === "true" || value === true;
  return value;
}

export async function executeRequest(endpoint, fieldValues, token) {
  let path = endpoint.path;
  const queryParams = {};
  const bodyObj = {};

  for (const field of endpoint.fields) {
    const raw = fieldValues[field.name];
    const val = coerce(raw, field.type);
    if (val === undefined || val === "") continue;

    if (field.paramType === "path") {
      path = path.replace(`:${field.name}`, encodeURIComponent(val));
    } else if (field.paramType === "query") {
      queryParams[field.name] = val;
    } else if (field.paramType === "body") {
      const key = field.bodyKey || field.name;
      // handle comma-separated arrays for uids/topics
      if ((field.name === "uids" || field.name === "topics" || field.name === "toUids") && typeof val === "string") {
        const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
        setNestedKey(bodyObj, key, field.type === "number" ? arr.map(Number) : arr);
      } else {
        setNestedKey(bodyObj, key, val);
      }
    }
  }

  const qs = new URLSearchParams(queryParams).toString();
  const url = `${BASE_URL}${path}${qs ? "?" + qs : ""}`;

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = {
    method: endpoint.method,
    mode: "cors",
    credentials: "include",
    headers,
  };

  if (!["GET", "DELETE"].includes(endpoint.method) || Object.keys(bodyObj).length > 0) {
    if (Object.keys(bodyObj).length > 0) {
      opts.body = JSON.stringify(bodyObj);
    }
  }
  // DELETE with body
  if (endpoint.method === "DELETE" && Object.keys(bodyObj).length > 0) {
    opts.body = JSON.stringify(bodyObj);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, opts);
    const elapsed = Date.now() - start;
    let data;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, data, elapsed, url };
  } catch (err) {
    return { ok: false, status: 0, statusText: "Network Error", data: { error: err.message }, elapsed: Date.now() - start, url };
  }
}
