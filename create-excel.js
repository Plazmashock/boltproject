const ExcelJS = require("exceljs");

async function createSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Goodwill Data");

  // Add headers
  worksheet.addRow([
    "Item Name",
    "Description",
    "Barcode",
    "Price",
    "Category",
    "Condition",
  ]);

  // Add sample data
  const data = [
    [
      "Samsung Galaxy Phone",
      "მობილური ტელეფონი Samsung",
      "123456789012",
      150.0,
      "Electronics",
      "Good",
    ],
    ["Blue Jeans", "ლურჯი ჯინსები", "12345", 25.0, "Clothing", "Fair"],
    [
      "Harry Potter Book",
      "წიგნი ჰარი პოტერი",
      "1234567890",
      10.0,
      "Books",
      "Excellent",
    ],
    ["Office Chair", "ოფისის სკამი", "123456789", 75.0, "Furniture", "Good"],
    ["Coffee Maker", "ყავის აპარატი", "12345678", 30.0, "Electronics", "Fair"],
    ["Winter Jacket", "ზამთრის კურტკა", "123", 45.0, "Clothing", "Good"],
  ];

  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  // Save the file
  await workbook.xlsx.writeFile("sample-goodwill-data.xlsx");
  console.log("Sample Excel file created: sample-goodwill-data.xlsx");
}

createSampleExcel().catch(console.error);
