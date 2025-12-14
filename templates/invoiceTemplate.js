module.exports = (data) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #000;
    margin: 25px 30px;
  }

  /* ---------------- HEADER ---------------- */
  .header {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .company-name {
    font-size: 18px;
    font-weight: bold;
  }

  .company-info {
    margin-top: 4px;
    line-height: 1.4;
  }

  /* ---------------- INVOICE INFO ---------------- */
  .info-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  }

  .info-box {
    width: 48%;
    line-height: 1.6;
  }

  .right {
    text-align: right;
  }

  .label {
    font-weight: bold;
  }

  /* ---------------- TABLE ---------------- */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  th, td {
    border: 1.5px solid #000;
    padding: 6px;
    font-size: 12px;
  }

  th {
    background: #e6e6e6;
    text-align: center;
    font-weight: bold;
  }

  td {
    vertical-align: top;
  }

  .text-right {
    text-align: right;
  }

  .service {
    font-weight: bold;
  }

  /* ---------------- TOTALS ---------------- */
  .totals {
    width: 55%;
    float: right;
    margin-top: 8px;
  }

  .totals th {
    background: #f0f0f0;
    text-align: left;
  }

  /* ---------------- FOOTER ---------------- */
  .footer {
    clear: both;
    margin-top: 30px;
    font-size: 12px;
    line-height: 1.6;
  }

  .footer-title {
    font-weight: bold;
    margin-top: 12px;
  }

  .signatory {
    margin-top: 35px;
    font-weight: bold;
  }

  .note {
    margin-top: 20px;
    text-align: center;
    font-size: 11px;
    font-weight: bold;
  }
</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div class="company-name">${data.company.name}</div>
  <div class="company-info">
    ${data.company.address}<br/>
    Mobile: ${data.company.phone} &nbsp; PAN Number: ${data.company.pan}<br/>
    Email: ${data.company.email} &nbsp; Website: ${data.company.website}
  </div>
</div>

<!-- INVOICE INFO -->
<div class="info-row">
  <div class="info-box">
    <span class="label">BILL TO</span><br/>
    ${data.student.code} ${data.student.name}<br/>
    Mobile: ${data.student.mobile}
  </div>

  <div class="info-box right">
    <span class="label">Invoice No.:</span> ${data.invoiceNo}<br/>
    <span class="label">Invoice Date:</span> ${data.invoiceDate}<br/>
    <span class="label">Due Date:</span> ${data.dueDate}
  </div>
</div>

<!-- SERVICES TABLE -->
<table>
  <thead>
    <tr>
      <th>SERVICES</th>
      <th>SAC</th>
      <th>QTY</th>
      <th>RATE</th>
      <th>DISC.</th>
      <th>AMOUNT</th>
    </tr>
  </thead>
  <tbody>
    ${data.items.map(i => `
    <tr>
      <td class="service">${i.name}</td>
      <td class="text-right">${i.sac}</td>
      <td class="text-right">${i.qty}</td>
      <td class="text-right">₹ ${i.rate}</td>
      <td class="text-right">₹ ${i.discount}</td>
      <td class="text-right">₹ ${i.amount}</td>
    </tr>
    `).join("")}
  </tbody>
</table>

<!-- TOTALS -->
<table class="totals">
  <tr>
    <th>SUBTOTAL</th>
    <td class="text-right">₹ ${data.subtotal}</td>
  </tr>
  <tr>
    <th>Received Amount</th>
    <td class="text-right">₹ ${data.receivedAmount}</td>
  </tr>
  <tr>
    <th>Total Amount</th>
    <td class="text-right"><strong>₹ ${data.total}</strong></td>
  </tr>
</table>

<!-- FOOTER -->
<div class="footer">
  <div class="footer-title">BANK DETAILS</div>
  Name: ${data.bank.name}<br/>
  IFSC Code: ${data.bank.ifsc}<br/>
  Account No: ${data.bank.account}<br/>
  Bank: ${data.bank.branch}<br/><br/>

  <div class="footer-title">Total Amount (in words)</div>
  ${data.totalWords}

  <div class="signatory">
    AUTHORISED SIGNATORY FOR<br/>
    ${data.company.name}
  </div>
</div>

<div class="note">
  BILL OF SUPPLY ORIGINAL FOR RECIPIENT
</div>

</body>
</html>
`;
