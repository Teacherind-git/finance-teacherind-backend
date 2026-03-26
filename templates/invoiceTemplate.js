module.exports = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #000;
      margin: 20px;
    }

    .container {
      border: 2px solid #000;
      padding: 20px;
    }

    .header {
      display: flex;
      gap: 15px;
    }

    .logo img {
      width: 90px;
    }

    .company-details {
      flex: 1;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #c40000;
    }

    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
    }

    .bill-to {
      margin-top: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    th, td {
      border: 1px solid #000;
      padding: 6px;
    }

    th {
      background: #f0f0f0;
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .bank-box {
      margin-top: 15px;
      border: 1px solid #000;
      padding: 10px;
    }

    .footer {
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
    }


      .signature-box {
  text-align: right;
}

.signature-img {
  width: 150px;
  display: block;
  margin-left: auto;
}
  </style>
</head>

<body>
  <div class="container">

    <!-- HEADER -->
    <div class="header">
      <div class="logo">
        <img src="http://localhost:5000/public/logo/logo.png" />
      </div>
      <div class="company-details">
        <div class="company-name">teacherInd Loro Talento Pvt Ltd.</div>
        <div>teacherInd Tower, pulpatta (po), Malappuram, Kerala, 673641</div>
        <div>Mobile: 7907361068 &nbsp; PAN Number: AALCT6766C</div>
        <div>Email: teacherindedu@gmail.com</div>
        <div>Website: www.teacherind.com</div>
      </div>
    </div>

    <!-- INVOICE META -->
    <div class="invoice-meta">
      <div>
        <strong>Invoice No.:</strong> ${data.invoiceNo}
      </div>
      <div>
        <strong>Invoice Date:</strong> ${data.invoiceDate}<br/>
        <strong>Due Date:</strong> ${data.dueDate}
      </div>
    </div>

    <!-- BILL TO -->
    <div class="bill-to">
      <strong>BILL TO</strong><br/>
      ${data.student.name}<br/>
      Mobile: ${data.student.mobile ?? "-"}
    </div>

    <!-- SERVICES TABLE -->
    <table>
      <tr>
        <th class="left">SERVICES</th>
        <th class="left">SAC</th>
        <th class="left">QTY</th>
        <th class="left">RATE</th>
        <th class="left">DISC.</th>
        <th class="left">AMOUNT</th>
      </tr>

      ${data.items
        ?.map(
          (i) => `
        <tr>
          <td class="left">${i.name}<br> <b>${i.description}</b></td>
          <td class="left">${i.sac}</td>
          <td class="left">${i.qty}</td>
          <td class="right">${i.rate}</td>
          <td class="right">${i.discount}</td>
          <td class="right">${i.amount}</td>
        </tr>
      `,
        )
        .join("")}

      <tr>
        <th colspan="4" class="right">SUBTOTAL</th>
        <th class="right">${data.totalDiscount}</th>
        <th class="right">₹ ${data.subtotal}</th>
      </tr>
    </table>

   
    <!-- TOTALS -->
    <table>
      <tr>
        <td>Total Amount</td>
        <td class="right">₹ ${data.subtotal}</td>
      </tr>
    </table>

     <!-- BANK DETAILS -->
    <div class="bank-box">
      <strong>BANK DETAILS</strong><br/><br/>
      Name: teacherInd Loro Talento Pvt Ltd<br/>
      IFSC Code: FDRL0002515<br/>
      Account No: 25150200002750<br/>
      Bank: Federal Bank, Kizhissery
    </div>


    <p><strong>Total Amount (in words)</strong><br/>
      ${data.amountInWords}
    </p>

    <!-- FOOTER -->
   <div class="footer">
  <div>BILL OF SUPPLY ORIGINAL FOR RECIPIENT</div>
  
  <div class="sign">
    <img src="http://localhost:5000/public/logo/sign.png" alt="Signature" class="signature-img" />

    <strong>AUTHORISED SIGNATORY FOR</strong><br/>
    teacherInd Loro Talento Pvt Ltd.
  </div>
</div>

  </div>
</body>
</html>
`;
