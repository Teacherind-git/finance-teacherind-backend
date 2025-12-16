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
      margin: 0;
      padding: 0;
    }

    /* ===== OUTER BORDER ===== */
    .page-border {
      border: 2px solid #000;
      padding: 18px;
      margin: 15px;
    }

    .container {
      width: 100%;
    }

     .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #c40000;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .logo img {
      height: 55px;
    }

    .company-details {
      text-align: left;
      font-size: 11px;
      line-height: 1.5;
    }

    /* ===== INFO ROWS ===== */
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }

    .title {
      text-align: center;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 20px 0 10px;
    }

    /* ===== BOX SECTIONS ===== */
    .box {
      border: 1px solid #000;
      padding: 8px;
      margin-top: 10px;
      font-size: 12px;
    }

    /* ===== TOTAL ===== */
    .total {
      text-align: right;
      font-size: 20px;
      font-weight: bold;
      margin-top: 10px;
    }

    /* ===== TABLE ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    table th,
    table td {
      border: 1px solid #000;
      padding: 6px;
      text-align: center;
      font-size: 11px;
    }

    table th {
      font-weight: bold;
      background: #f2f2f2;
    }

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 40px;
      text-align: right;
      font-size: 11px;
    }
  </style>
</head>

<body>
  <div class="page-border">
    <div class="container">

      <!-- HEADER -->
      <div class="header">
        <div class="logo">
          <img src="http://localhost:5000/public/logo/logo.png" />
        </div>

        <div class="company-details">
         <div class="company-name">teacherInd Loro Talento Pvt Ltd.</div>
        <div>teacherInd Tower, pulpatta (po), Malappuram, Kerala, 673641</div>
        <div>Mobile: 7907361068 &nbsp;&nbsp; PAN: AALCT6766C</div>
        <div>Email: teacherindedu@gmail.com</div>
        <div>Website: www.teacherind.com</div>
        </div>
      </div>

      <!-- PAYMENT INFO -->
      <div class="info-row">
        <div><strong>Payment Number:</strong> ${data.paymentNumber}</div>
        <div><strong>Payment Date:</strong> ${data.paymentDate}</div>
      </div>

      <div class="info-row">
        <div><strong>Payment Mode:</strong> ${data.paymentMode}</div>
      </div>

      <!-- TITLE -->
      <div class="title">RECEIPT VOUCHER</div>

      <!-- PAYMENT FROM -->
      <div class="box">
        <strong>PAYMENT FROM</strong><br />
        ${data.studentName}
      </div>

     

      <!-- TABLE -->
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Invoice Number</th>
            <th>Invoice Date</th>
            <th>Invoice Amount (₹)</th>
            <th>Payment Amount (₹)</th>
            <th>TDS (₹)</th>
            <th>Balance Due (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.invoiceNumber}</td>
              <td>${item.invoiceDate}</td>
              <td>${item.invoiceAmount.toFixed(2)}</td>
              <td>${item.paymentAmount.toFixed(2)}</td>
              <td>${item.tds.toFixed(2)}</td>
              <td>${item.balance.toFixed(2)}</td>
            </tr>
          `
            )
            .join("")}

          <tr>
            <td colspan="3"><strong>TOTAL</strong></td>
            <td colspan="4"><strong>${data.totalAmount.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>

       <!-- TOTAL -->
      <div class="total">
        Total : ₹ ${data.totalAmount.toFixed(2)}
      </div>

      <!-- AMOUNT IN WORDS -->
      <div class="box">
        <strong>Amount Paid in Words</strong><br />
        ${data.amountInWords}
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Authorized signatory for<br />
        <strong>${data.companyName}</strong>
      </div>

    </div>
  </div>
</body>
</html>
`;
