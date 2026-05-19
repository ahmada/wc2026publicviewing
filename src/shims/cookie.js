// ESM shim for the `cookie` npm package (v1.1.1).
// Needed because Cloudflare Workers' module runner can't handle the CJS wrapper
// that Vite generates for this package during SSR dep optimization.
// All code is copied verbatim from cookie/dist/index.js; no Node.js APIs used.

const cookieNameRegExp = /^[!-:<>-~]+$/;
const cookieValueRegExp = /^[!-:<-~]*$/;
const domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const pathValueRegExp = /^[ -:=-~]*$/;
const maxAgeRegExp = /^-?\d+$/;
const __toString = Object.prototype.toString;

const NullObject = (() => {
  const C = function () {};
  C.prototype = Object.create(null);
  return C;
})();

export function parseCookie(str, options) {
  const obj = new NullObject();
  const len = str.length;
  if (len < 2) return obj;
  const dec = options?.decode || decode;
  let index = 0;
  do {
    const eqIdx = eqIndex(str, index, len);
    if (eqIdx === -1) break;
    const endIdx = endIndex(str, index, len);
    if (eqIdx > endIdx) {
      index = str.lastIndexOf(';', eqIdx - 1) + 1;
      continue;
    }
    const key = valueSlice(str, index, eqIdx);
    if (obj[key] === undefined) {
      obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
    }
    index = endIdx + 1;
  } while (index < len);
  return obj;
}

export const parse = parseCookie;

export function stringifyCookie(cookie, options) {
  const enc = options?.encode || encodeURIComponent;
  const cookieStrings = [];
  for (const name of Object.keys(cookie)) {
    const val = cookie[name];
    if (val === undefined) continue;
    if (!cookieNameRegExp.test(name)) throw new TypeError(`cookie name is invalid: ${name}`);
    const value = enc(val);
    if (!cookieValueRegExp.test(value)) throw new TypeError(`cookie val is invalid: ${val}`);
    cookieStrings.push(`${name}=${value}`);
  }
  return cookieStrings.join('; ');
}

export function stringifySetCookie(_name, _val, _opts) {
  const cookie = typeof _name === 'object' ? _name : { ..._opts, name: _name, value: String(_val) };
  const options = typeof _val === 'object' ? _val : _opts;
  const enc = options?.encode || encodeURIComponent;
  if (!cookieNameRegExp.test(cookie.name)) throw new TypeError(`argument name is invalid: ${cookie.name}`);
  const value = cookie.value ? enc(cookie.value) : '';
  if (!cookieValueRegExp.test(value)) throw new TypeError(`argument val is invalid: ${cookie.value}`);
  let str = cookie.name + '=' + value;
  if (cookie.maxAge !== undefined) {
    if (!Number.isInteger(cookie.maxAge)) throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
    str += '; Max-Age=' + cookie.maxAge;
  }
  if (cookie.domain) {
    if (!domainValueRegExp.test(cookie.domain)) throw new TypeError(`option domain is invalid: ${cookie.domain}`);
    str += '; Domain=' + cookie.domain;
  }
  if (cookie.path) {
    if (!pathValueRegExp.test(cookie.path)) throw new TypeError(`option path is invalid: ${cookie.path}`);
    str += '; Path=' + cookie.path;
  }
  if (cookie.expires) {
    if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) throw new TypeError(`option expires is invalid: ${cookie.expires}`);
    str += '; Expires=' + cookie.expires.toUTCString();
  }
  if (cookie.httpOnly) str += '; HttpOnly';
  if (cookie.secure) str += '; Secure';
  if (cookie.partitioned) str += '; Partitioned';
  if (cookie.priority) {
    const priority = typeof cookie.priority === 'string' ? cookie.priority.toLowerCase() : undefined;
    switch (priority) {
      case 'low': str += '; Priority=Low'; break;
      case 'medium': str += '; Priority=Medium'; break;
      case 'high': str += '; Priority=High'; break;
      default: throw new TypeError(`option priority is invalid: ${cookie.priority}`);
    }
  }
  if (cookie.sameSite) {
    const sameSite = typeof cookie.sameSite === 'string' ? cookie.sameSite.toLowerCase() : cookie.sameSite;
    switch (sameSite) {
      case true:
      case 'strict': str += '; SameSite=Strict'; break;
      case 'lax': str += '; SameSite=Lax'; break;
      case 'none': str += '; SameSite=None'; break;
      default: throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
    }
  }
  return str;
}

export const serialize = stringifySetCookie;

export function parseSetCookie(str, options) {
  const dec = options?.decode || decode;
  const len = str.length;
  const endIdx = endIndex(str, 0, len);
  const eqIdx = eqIndex(str, 0, endIdx);
  const setCookie = eqIdx === -1
    ? { name: '', value: dec(valueSlice(str, 0, endIdx)) }
    : { name: valueSlice(str, 0, eqIdx), value: dec(valueSlice(str, eqIdx + 1, endIdx)) };
  let index = endIdx + 1;
  while (index < len) {
    const endIdx = endIndex(str, index, len);
    const eqIdx = eqIndex(str, index, endIdx);
    const attr = eqIdx === -1 ? valueSlice(str, index, endIdx) : valueSlice(str, index, eqIdx);
    const val = eqIdx === -1 ? undefined : valueSlice(str, eqIdx + 1, endIdx);
    switch (attr.toLowerCase()) {
      case 'httponly': setCookie.httpOnly = true; break;
      case 'secure': setCookie.secure = true; break;
      case 'partitioned': setCookie.partitioned = true; break;
      case 'domain': setCookie.domain = val; break;
      case 'path': setCookie.path = val; break;
      case 'max-age':
        if (val && maxAgeRegExp.test(val)) setCookie.maxAge = Number(val);
        break;
      case 'expires': {
        if (!val) break;
        const date = new Date(val);
        if (Number.isFinite(date.valueOf())) setCookie.expires = date;
        break;
      }
      case 'priority': {
        if (!val) break;
        const priority = val.toLowerCase();
        if (priority === 'low' || priority === 'medium' || priority === 'high') setCookie.priority = priority;
        break;
      }
      case 'samesite': {
        if (!val) break;
        const sameSite = val.toLowerCase();
        if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') setCookie.sameSite = sameSite;
        break;
      }
    }
    index = endIdx + 1;
  }
  return setCookie;
}

function endIndex(str, min, len) {
  const index = str.indexOf(';', min);
  return index === -1 ? len : index;
}

function eqIndex(str, min, max) {
  const index = str.indexOf('=', min);
  return index < max ? index : -1;
}

function valueSlice(str, min, max) {
  let start = min;
  let end = max;
  do {
    const code = str.charCodeAt(start);
    if (code !== 0x20 && code !== 0x09) break;
  } while (++start < end);
  while (end > start) {
    const code = str.charCodeAt(end - 1);
    if (code !== 0x20 && code !== 0x09) break;
    end--;
  }
  return str.slice(start, end);
}

function decode(str) {
  if (str.indexOf('%') === -1) return str;
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

function isDate(val) {
  return __toString.call(val) === '[object Date]';
}
