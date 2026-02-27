export function getOtpEmailHtml(username: string, otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F2EEFA;font-family:'PT Sans',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F2EEFA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(112,59,227,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#703BE3 0%,#9B6BF0 100%);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Tapaar</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Bonjour <strong>${username}</strong>,</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;">Voici votre code de vérification pour réinitialiser votre mot de passe :</p>
              <div style="background-color:#F2EEFA;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#703BE3;">${otp}</span>
              </div>
              <p style="margin:0 0 8px;color:#555;font-size:14px;">Ce code expire dans <strong>15 minutes</strong>.</p>
              <p style="margin:0;color:#888;font-size:13px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">&copy; ${new Date().getFullYear()} Tapaar. Tous droits réservés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getSignupOtpEmailHtml(username: string, otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F2EEFA;font-family:'PT Sans',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F2EEFA;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(112,59,227,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#703BE3 0%,#9B6BF0 100%);padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Tapaar</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#333;font-size:16px;">Bienvenue <strong>${username}</strong> !</p>
              <p style="margin:0 0 24px;color:#555;font-size:15px;">Voici votre code de vérification pour activer votre compte :</p>
              <div style="background-color:#F2EEFA;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#703BE3;">${otp}</span>
              </div>
              <p style="margin:0 0 8px;color:#555;font-size:14px;">Ce code expire dans <strong>15 minutes</strong>.</p>
              <p style="margin:0;color:#888;font-size:13px;">Si vous n'avez pas créé de compte sur Tapaar, ignorez cet e-mail.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;color:#aaa;font-size:12px;">&copy; ${new Date().getFullYear()} Tapaar. Tous droits réservés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
