/**
 * Placeholder email sender utility.
 * You can later swap this to use Resend, SendGrid, or Nodemailer.
 */

export async function sendDropEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  // Option 1: Using Resend (preferred for simplicity)
  // Uncomment and set RESEND_API_KEY in env if available:
  //
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY!)
  // await resend.emails.send({
  //   from: 'Vállalhatatlan <noreply@vallalhatatlan.online>',
  //   to,
  //   subject,
  //   html: body,
  // })

  // Option 2: Temporary console fallback
  console.log('=== Sending drop email ===')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('Body:', body)
}
