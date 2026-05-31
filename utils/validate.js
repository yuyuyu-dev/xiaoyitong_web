/**
 * utils/validate.js
 * 表单校验工具函数，纯函数，不依赖任何框架
 */

/**
 * 邮箱格式校验
 */
export function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

/**
 * 密码强度：至少 6 位
 */
export function isValidPassword(str) {
  return typeof str === 'string' && str.length >= 6;
}

/**
 * 非空字符串
 */
export function isNonEmpty(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * 价格：正数
 */
export function isValidPrice(val) {
  const n = Number(val);
  return !isNaN(n) && n > 0;
}

/**
 * 批量校验商品发布表单
 * @param {{ title, price, location, desc }} fields
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePublishForm({ title, price, location, desc }) {
  if (!isNonEmpty(title))    return { valid: false, message: '请填写商品标题' };
  if (!isValidPrice(price))  return { valid: false, message: '请填写有效的商品价格（正数）' };
  if (!isNonEmpty(location)) return { valid: false, message: '请填写交易地点' };
  if (!isNonEmpty(desc))     return { valid: false, message: '请填写商品描述' };
  return { valid: true, message: '' };
}

/**
 * 批量校验注册表单
 */
export function validateRegisterSendCode({ email, password, confirmPassword, nickname, school }) {
  if (!isEmail(email))                   return { valid: false, message: '邮箱格式不正确' };
  if (!isValidPassword(password))         return { valid: false, message: '密码至少 6 位' };
  if (password !== confirmPassword)       return { valid: false, message: '两次密码输入不一致' };
  if (!isNonEmpty(nickname))              return { valid: false, message: '请填写昵称' };
  if (!isNonEmpty(school))                return { valid: false, message: '请填写学校' };
  return { valid: true, message: '' };
}

export function validateRegisterForm({ email, password, confirmPassword, nickname, school, code }) {
  const initial = validateRegisterSendCode({ email, password, confirmPassword, nickname, school });
  if (!initial.valid) return initial;
  if (!isNonEmpty(code)) return { valid: false, message: '请填写验证码' };
  return { valid: true, message: '' };
}
