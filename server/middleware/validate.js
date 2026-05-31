const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

export function validateLength(val, name, min = 1, max = 500) {
  if (typeof val !== 'string') return `${name}格式不正确`;
  const trimmed = val.trim();
  if (trimmed.length < min) return `${name}不能为空`;
  if (trimmed.length > max) return `${name}不能超过${max}个字符`;
  return null;
}

export function validatePrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '价格必须大于 0';
  if (n > 99999) return '价格不能超过 99999';
  return null;
}

export function validateLimit(limit, defaultVal = 40, max = 100) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return defaultVal;
  return Math.min(Math.floor(n), max);
}

export function sendError(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

export function buildProfile(row) {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    school: row.school,
    bio: row.bio,
    avatar_url: row.avatar_url,
    is_admin: !!row.is_admin,
    created_at: row.created_at
  };
}

export function buildPublicProfile(row) {
  const { email, ...pub } = buildProfile(row);
  return pub;
}

export function buildGoods(row) {
  return {
    id: row.id,
    seller_id: row.seller_id,
    title: row.title,
    price: Number(row.price),
    category: row.category,
    condition: row.condition,
    location: row.location,
    description: row.description,
    image_url: row.image_url,
    hot: Number(row.hot),
    status: row.status || 'available',
    created_at: row.created_at,
    profiles: {
      id: row.seller_id,
      nickname: row.seller_nickname,
      school: row.seller_school,
      bio: row.seller_bio,
      avatar_url: row.seller_avatar_url
    }
  };
}
