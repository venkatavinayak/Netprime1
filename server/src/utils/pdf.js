const PDFDocument = require('pdfkit');

const generateInvoicePDF = (payment, user, stream) => {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(stream);

  // Logo & Header
  doc.fillColor('#ff007f').fontSize(24).text('NETPRIME', 50, 50);
  doc.fillColor('#555555').fontSize(10).text('Premium Cinematic Entertainment', 50, 80);

  // Invoice identifiers
  doc.fillColor('#000000').fontSize(11).text(`Invoice ID: NP-INV-${payment._id.toString().substring(0, 8).toUpperCase()}`, 350, 50);
  doc.text(`Date Issued: ${new Date(payment.createdAt).toLocaleDateString()}`, 350, 68);
  doc.text(`Payment ID: ${payment.razorpayPaymentId || 'N/A'}`, 350, 86);

  // Draw separator line
  doc.moveTo(50, 115).lineTo(550, 115).strokeColor('#dddddd').stroke();

  // Subscriber profile
  doc.moveDown(1.5);
  doc.fontSize(13).fillColor('#ff007f').text('Subscriber Details', 50, 135);
  doc.fontSize(10).fillColor('#333333').text(`Account Name: ${user.name}`, 50, 155);
  doc.text(`Email Address: ${user.email}`, 50, 170);

  // Billing Item headers
  doc.fontSize(13).fillColor('#ff007f').text('Billing Description', 50, 205);
  doc.fontSize(10).fillColor('#000000').text('Item / Tier Name', 50, 230);
  doc.text('Tax (18% GST)', 330, 230);
  doc.text('Amount (INR)', 470, 230);
  doc.moveTo(50, 245).lineTo(550, 245).strokeColor('#eeeeee').stroke();

  // Billing Row details
  const amount = payment.amount || 0;
  const baseAmt = (amount / 1.18).toFixed(2);
  const gstAmt = (amount - baseAmt).toFixed(2);

  doc.fillColor('#555555').text(`NetPrime Premium Access (${payment.plan})`, 50, 255);
  doc.text(`₹${gstAmt}`, 330, 255);
  doc.text(`₹${amount.toFixed(2)}`, 470, 255);
  doc.moveTo(50, 275).lineTo(550, 275).strokeColor('#eeeeee').stroke();

  // Totals Billed
  doc.fontSize(11).fillColor('#000000').text('Total Paid:', 330, 290);
  doc.fontSize(13).fillColor('#ff007f').text(`₹${amount.toFixed(2)} INR`, 470, 288);

  // Footer notes
  doc.moveDown(3);
  doc.fontSize(8.5).fillColor('#888888').text(
    'This is a computer-generated transaction receipt. Premium access has been activated in accordance with the terms of service. For technical assistance or billing claims, submit a support ticket on the portal or email billing@netprime.com.',
    50, 360, { width: 500, align: 'center', lineGap: 3 }
  );

  doc.end();
};

module.exports = { generateInvoicePDF };
