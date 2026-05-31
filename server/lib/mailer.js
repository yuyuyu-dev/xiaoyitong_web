import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

export async function sendVerificationCode(email, code) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP未配置，跳过邮件发送。验证码已存入数据库。');
    return false;
  }
  await t.sendMail({
    from: `校易通 <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: '【校易通】您的注册验证码',
    html: `
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif;color:#1a1a1a;background:#f8fafc;">
      <div style="background:#fff;border-radius:16px;padding:36px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:24px;font-weight:900;line-height:56px;">校</div>
          <h1 style="margin:16px 0 4px;font-size:22px;color:#1a1a1a;">欢迎注册校易通</h1>
          <p style="margin:0;font-size:14px;color:#64748b;">一个更懂你的校园二手交易平台</p>
        </div>

        <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:14px;color:#64748b;">您的注册验证码为</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#6366f1;">${code}</div>
          <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">10 分钟内有效，请勿泄露给他人</p>
        </div>

        <p style="font-size:14px;color:#64748b;line-height:1.7;">
          如果您没有注册校易通账号，请忽略此邮件。<br>
          此邮件由系统自动发送，请勿直接回复。
        </p>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="font-size:12px;color:#94a3b8;text-align:center;">
          校易通 · 校园二手交易平台<br>
          让校园闲置，重新流动起来
        </p>
      </div>
    </div>`
  });
  return true;
}
