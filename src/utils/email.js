// src/utils/email.js
import nodemailer from 'nodemailer'
import { generateInvoicePDF } from './invoice.js'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// ── Send booking confirmation email with PDF invoice ──
export async function sendBookingConfirmation(booking, room) {
  const transporter = createTransport()

  const checkinStr  = new Date(booking.checkIn).toLocaleDateString('en-IN',  { day: '2-digit', month: 'long', year: 'numeric' })
  const checkoutStr = new Date(booking.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const paidAmt     = booking.payment?.amount || 0
  const due         = booking.totalAmount - paidAmt

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(booking, room)

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin:0; font-family: Arial, sans-serif; background: #f5f0e8; }
      .wrap { max-width: 580px; margin: 0 auto; background: #ffffff; }
      .header { background: #2D4A32; padding: 32px 40px; }
      .header h1 { color: #fff; margin:0; font-size: 24px; font-weight: 400; }
      .header p { color: #9ec4a5; margin: 4px 0 0; font-size: 13px; }
      .badge { display: inline-block; background: #C9A96E; color: #1C1917; padding: 4px 14px; font-size: 12px; font-weight: bold; margin-top: 12px; }
      .body { padding: 32px 40px; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0e6ce; font-size: 14px; }
      .row .label { color: #888; }
      .total-row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #2D4A32; margin-top: 4px; }
      .green { color: #2a7a3a; }
      .footer { background: #2D4A32; padding: 20px 40px; color: #9ec4a5; font-size: 12px; }
      .note { background: #FBF5E6; padding: 16px; font-size: 12px; color: #666; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <h1>Village Utopia Cottages</h1>
        <p>Goa, India · stay@villageutopia.in</p>
        <div class="badge">✓ BOOKING CONFIRMED</div>
      </div>
      <div class="body">
        <p style="font-size:16px;">Dear <strong>${booking.guestName}</strong>,</p>
        <p style="color:#555;font-size:14px;line-height:1.6;">
          Your booking at Village Utopia Cottages is confirmed. We look forward to welcoming you.
          Your invoice is attached to this email.
        </p>

        <h3 style="color:#2D4A32;border-bottom:2px solid #C9A96E;padding-bottom:6px;">Booking Details</h3>

        <div class="row"><span class="label">Booking Reference</span><strong>${booking.bookingRef}</strong></div>
        <div class="row"><span class="label">Room / Cottage</span><span>${room.name}</span></div>
        <div class="row"><span class="label">Check-in</span><span>${checkinStr} · 12:00 PM</span></div>
        <div class="row"><span class="label">Check-out</span><span>${checkoutStr} · 11:00 AM</span></div>
        <div class="row"><span class="label">Nights</span><span>${booking.nights}</span></div>
        <div class="row"><span class="label">Guests</span><span>${booking.guests}</span></div>

        <h3 style="color:#2D4A32;border-bottom:2px solid #C9A96E;padding-bottom:6px;margin-top:24px;">Payment</h3>

        <div class="row"><span class="label">Total Amount</span><span>₹${booking.totalAmount.toLocaleString('en-IN')}</span></div>
        <div class="row"><span class="label">Paid Now</span><span class="green">₹${paidAmt.toLocaleString('en-IN')}</span></div>
        ${due > 0 ? `<div class="row"><span class="label">Balance (due on arrival)</span><span style="color:#b05a00;">₹${due.toLocaleString('en-IN')}</span></div>` : ''}

        <div class="note">
          <strong>📍 Directions:</strong> Exact property location will be shared 24 hours before check-in.<br/>
          <strong>📞 Contact:</strong> +91 98765 43210 · stay@villageutopia.in<br/>
          <strong>❌ Cancellation:</strong> Free cancellation up to 48 hours before check-in.
        </div>

        <p style="font-size:13px;color:#888;margin-top:24px;">
          To view or manage your booking, log in to your account at villageutopia.in
        </p>
      </div>
      <div class="footer">
        Village Utopia Cottages · Goa, India<br/>
        © ${new Date().getFullYear()} All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `

  await transporter.sendMail({
    from:        process.env.FROM_EMAIL,
    to:          booking.guestEmail,
    subject:     `✓ Booking Confirmed — ${booking.bookingRef} | Village Utopia Cottages`,
    html,
    attachments: [
      {
        filename:    `VillageUtopia-${booking.bookingRef}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })

  console.log(`[EMAIL] Confirmation sent to ${booking.guestEmail} for ${booking.bookingRef}`)
}

// ── Send cancellation email ──
export async function sendCancellationEmail(booking) {
  const transporter = createTransport()

  await transporter.sendMail({
    from:    process.env.FROM_EMAIL,
    to:      booking.guestEmail,
    subject: `Booking Cancelled — ${booking.bookingRef} | Village Utopia`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;">
        <div style="background:#2D4A32;padding:24px;color:#fff;">
          <h2 style="margin:0;">Village Utopia Cottages</h2>
        </div>
        <div style="padding:24px;">
          <p>Dear <strong>${booking.guestName}</strong>,</p>
          <p>Your booking <strong>${booking.bookingRef}</strong> has been cancelled.</p>
          <p style="color:#555;">Refund (if applicable) will be processed within 5–7 business days as per our cancellation policy.</p>
          <p>Questions? Contact us at stay@villageutopia.in or +91 98765 43210.</p>
        </div>
      </div>
    `,
  })
}
