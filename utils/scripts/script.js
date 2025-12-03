// updateTable.js
const fs = require("fs");
const cheerio = require("cheerio");

// ==== Short code → Style mapping ====
const colorMap = {
  B: { background: "blue", color: "white" },
  G: { background: "green", color: "white" },
  R: { background: "red", color: "white" },
  P: { background: "pink", color: "green" },
  Y: { background: "gold", color: "black" },
  O: { background: "rgb(255,145,2)", color: "white" },
};

// ==== Your simplified input data ====
const updateData = [
  ["1", "B", "PRAVASI"],
  ["2", "G", ""],
  ["736", "G", "NRI"],
  // More rows...
];

// Convert array → object for easier use
const parsedData = updateData.map(([id, code, extra]) => {
  const style = colorMap[code] || {};
  return {
    id,
    background: style.background,
    color: style.color,
    extra,
  };
});

// ==== Read the HTML file ====
const inputFile = "input.html";
const outputFile = "output.html";

const html = fs.readFileSync(inputFile, "utf8");
const $ = cheerio.load(html);

// ==== Update table rows ====
$(".voters-list tr").each(function () {
  const tr = $(this);
  const serial = tr.find("td strong").text().trim();
  if (!serial) return;

  const match = parsedData.find((item) => item.id === serial);
  if (!match) return;

  tr.attr(
    "style",
    `background-color:${match.background}; color:${match.color}`
  );

  if (match.extra && match.extra !== "") {
    tr.append(
      `<td style="color:${match.color}; font-size:22px;"><strong>${match.extra}</strong></td>`
    );
  }
});

// ==== Save OUTPUT ====
fs.writeFileSync(outputFile, $.html(), "utf8");

console.log("HTML updated →", outputFile);
