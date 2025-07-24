import { Component, signal, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Meta, Title } from "@angular/platform-browser";
import { Workbook } from "exceljs";

@Component({
  selector: "app-root",
  imports: [FormsModule],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App implements OnInit {
  private meta = inject(Meta);
  private titleService = inject(Title);

  csvData = signal<string[][]>([]);
  headers = signal<string[]>([]);
  fileName = signal<string>("");
  selectedColumns = signal<number[]>([]);
  processedData = signal<string[][]>([]);
  processedHeaders = signal<string[]>([]);

  // Processing options
  validateBarcodes = false;

  ngOnInit() {
    this.setSeoMetaTags();
  }

  private setSeoMetaTags() {
    // Set page title
    this.titleService.setTitle(
      "CSV/Excel Column Selector - Professional Data Processing Tool"
    );

    // Set meta description
    this.meta.updateTag({
      name: "description",
      content:
        "Professional CSV and Excel file processor with column selection, barcode validation, and data export capabilities. Perfect for Goodwill workflow and data management.",
    });

    // Set meta keywords
    this.meta.updateTag({
      name: "keywords",
      content:
        "CSV processor, Excel file converter, column selector, data export, barcode validation, Goodwill workflow, data management, file processing",
    });

    // Set author
    this.meta.updateTag({
      name: "author",
      content: "CSV Column Selector",
    });

    // Set robots
    this.meta.updateTag({
      name: "robots",
      content: "index, follow",
    });

    // Open Graph tags for social media
    this.meta.updateTag({
      property: "og:title",
      content: "CSV/Excel Column Selector - Professional Data Processing Tool",
    });

    this.meta.updateTag({
      property: "og:description",
      content:
        "Professional CSV and Excel file processor with column selection, barcode validation, and data export capabilities.",
    });

    this.meta.updateTag({
      property: "og:type",
      content: "website",
    });

    this.meta.updateTag({
      property: "og:url",
      content: "https://your-domain.com",
    });

    // Twitter Card tags
    this.meta.updateTag({
      name: "twitter:card",
      content: "summary_large_image",
    });

    this.meta.updateTag({
      name: "twitter:title",
      content: "CSV/Excel Column Selector - Professional Data Processing Tool",
    });

    this.meta.updateTag({
      name: "twitter:description",
      content:
        "Professional CSV and Excel file processor with column selection, barcode validation, and data export capabilities.",
    });

    // Viewport and mobile optimization
    this.meta.updateTag({
      name: "viewport",
      content: "width=device-width, initial-scale=1.0",
    });

    // Theme color for mobile browsers
    this.meta.updateTag({
      name: "theme-color",
      content: "#2563eb",
    });
  }

  uploadFile(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    this.fileName.set(file.name);
    const fileExtension = file.name.toLowerCase().split(".").pop();

    if (fileExtension === "csv") {
      this.handleCsvFile(file);
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      this.handleExcelFile(file);
    } else {
      alert("Please select a valid CSV or Excel file (.csv, .xlsx, .xls)");
    }
  }

  private handleCsvFile(file: File) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      this.parseCsv(csvText);
    };

    reader.readAsText(file);
  }

  private async handleExcelFile(file: File) {
    try {
      const workbook = new Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      // Use the first worksheet
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert("No worksheets found in Excel file");
        return;
      }

      const data: string[][] = [];

      worksheet.eachRow((row, rowNumber) => {
        const rowData: string[] = [];
        row.eachCell((cell, colNumber) => {
          // Convert cell value to string
          let cellValue = "";
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === "object" && "text" in cell.value) {
              // Handle rich text
              cellValue = cell.value.text;
            } else {
              cellValue = cell.value.toString();
            }
          }
          rowData.push(cellValue);
        });
        data.push(rowData);
      });

      if (data.length === 0) {
        alert("No data found in Excel file");
        return;
      }

      // First row as headers
      this.headers.set(data[0]);

      // Rest as data
      this.csvData.set(data.slice(1));

      // Reset selections
      this.selectedColumns.set([]);
      this.processedData.set([]);
      this.processedHeaders.set([]);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      alert(
        "Error reading Excel file. Please make sure it's a valid Excel file."
      );
    }
  }

  private parseCsv(csvText: string) {
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length === 0) return;

    // Parse CSV with basic comma splitting (handles simple cases)
    const data = lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    });

    // First row as headers
    this.headers.set(data[0]);

    // Rest as data
    this.csvData.set(data.slice(1));

    // Reset selections
    this.selectedColumns.set([]);
    this.processedData.set([]);
    this.processedHeaders.set([]);
  }

  toggleColumn(columnIndex: number, event: any) {
    const isChecked = event.target.checked;
    const current = this.selectedColumns();

    if (isChecked) {
      this.selectedColumns.set([...current, columnIndex]);
    } else {
      this.selectedColumns.set(
        current.filter((index) => index !== columnIndex)
      );
    }
  }

  updateProcessingOptions() {
    // This method is called when processing options change
  }

  processData() {
    const selected = this.selectedColumns();
    if (selected.length === 0) return;

    const originalHeaders = this.headers();
    const originalData = this.csvData();

    let newHeaders: string[] = [];
    let newData: string[][] = [];

    // Find the შტრიხკოდი column for barcode validation
    const barcodeColumnIndex = originalHeaders.findIndex(
      (header) => header === "შტრიხკოდი"
    );
    const hasBarcodeColumn =
      barcodeColumnIndex !== -1 && selected.includes(barcodeColumnIndex);

    // Process each selected column
    selected.forEach((columnIndex) => {
      const header = originalHeaders[columnIndex];

      // Special handling for "შტრიხკოდი" - create both Barcode and SKU columns
      if (header === "შტრიხკოდი") {
        newHeaders.push("Barcode");
        newHeaders.push("SKU");
      } else {
        newHeaders.push(header);
      }
    });

    // Add barcode validation columns if option is selected and შტრიხკოდი is included
    if (this.validateBarcodes && hasBarcodeColumn) {
      newHeaders.push("Product main measure unit");
      newHeaders.push("Product main measure value");
      newHeaders.push("Is measured");
    }

    // Process data rows
    originalData.forEach((row, rowIndex) => {
      let newRow: string[] = [];

      selected.forEach((columnIndex) => {
        const header = originalHeaders[columnIndex];
        const cellValue = row[columnIndex] || "";

        // Special handling for "შტრიხკოდი" - duplicate the value for both Barcode and SKU
        if (header === "შტრიხკოდი") {
          newRow.push(cellValue); // Barcode
          newRow.push(cellValue); // SKU
        } else {
          newRow.push(cellValue);
        }
      });

      // Add barcode validation data if option is selected and შტრიხკოდი is included
      if (this.validateBarcodes && hasBarcodeColumn) {
        const barcodeValue = row[barcodeColumnIndex] || "";

        if (barcodeValue.length <= 10) {
          newRow.push("kg"); // Product main measure unit
          newRow.push("0,1"); // Product main measure value
          newRow.push("True"); // Is measured
        } else {
          newRow.push(""); // Product main measure unit (empty)
          newRow.push(""); // Product main measure value (empty)
          newRow.push("False"); // Is measured
        }
      }

      newData.push(newRow);
    });

    this.processedHeaders.set(newHeaders);
    this.processedData.set(newData);
  }

  downloadProcessedData() {
    const headers = this.processedHeaders();
    const data = this.processedData();

    if (headers.length === 0 || data.length === 0) return;

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `processed_${this.fileName()}`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
