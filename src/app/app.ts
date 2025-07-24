import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import * as ExcelJS from "exceljs";

interface ProcessingOptions {
  addTranslation: boolean;
  addCategories: boolean;
  validateBarcodes: boolean;
  applyGoodwillFormula: boolean;
}

@Component({
  selector: "app-root",
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  csvData = signal<string[][]>([]);
  headers = signal<string[]>([]);
  fileName = signal<string>("");
  selectedColumns = signal<number[]>([]);
  processedData = signal<string[][]>([]);
  processedHeaders = signal<string[]>([]);

  // Processing options
  addTranslation = false;
  addCategories = false;
  validateBarcodes = false;
  applyGoodwillFormula = false;

  // Sample categories for matching (you can expand this)
  categories = [
    { name: "Electronics", subcategories: ["Phones", "Computers", "Audio"] },
    { name: "Clothing", subcategories: ["Shirts", "Pants", "Shoes"] },
    { name: "Books", subcategories: ["Fiction", "Non-Fiction", "Textbooks"] },
    { name: "Home & Garden", subcategories: ["Furniture", "Decor", "Tools"] },
  ];

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
      const workbook = new ExcelJS.Workbook();
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
    // You can add validation or dependent logic here
  }

  processData() {
    const selected = this.selectedColumns();
    if (selected.length === 0) return;

    const originalHeaders = this.headers();
    const originalData = this.csvData();

    // Start with selected columns
    let newHeaders = selected.map((index) => originalHeaders[index]);
    let newData = originalData.map((row) =>
      selected.map((index) => row[index] || "")
    );

    // Add translation columns
    if (this.addTranslation) {
      const translationHeaders = selected.map(
        (index) => `${originalHeaders[index]}_EN`
      );
      newHeaders = [...newHeaders, ...translationHeaders];

      newData = newData.map((row, rowIndex) => {
        const translationCells = row.map((cell, cellIndex) => {
          const originalColIndex = selected[cellIndex];
          const cellRef = this.getCellReference(
            rowIndex + 2,
            originalColIndex + 1
          ); // +2 for header row, +1 for 1-based indexing
          return `=GOOGLETRANSLATE(${cellRef},"ka","en")`;
        });
        return [...row, ...translationCells];
      });
    }

    // Add category columns
    if (this.addCategories) {
      newHeaders = [...newHeaders, "Category", "Subcategory"];

      newData = newData.map((row) => {
        const category = this.matchCategory(row.join(" "));
        const subcategory = this.matchSubcategory(row.join(" "), category);
        return [...row, category, subcategory];
      });
    }

    // Add Goodwill formula column
    if (this.applyGoodwillFormula) {
      newHeaders = [...newHeaders, "Goodwill_Result"];

      newData = newData.map((row, rowIndex) => {
        if (selected.length >= 2) {
          const cellA = this.getCellReference(rowIndex + 2, selected[0] + 1);
          const cellB = this.getCellReference(rowIndex + 2, selected[1] + 1);
          const formula = `=GOODWILL(${cellA},${cellB})`;
          return [...row, formula];
        }
        return [...row, ""];
      });
    }

    // Add barcode validation
    if (this.validateBarcodes) {
      newHeaders = [...newHeaders, "Barcode_Status"];

      newData = newData.map((row, rowIndex) => {
        const barcodeColumn = this.findBarcodeColumn();
        if (barcodeColumn !== -1 && selected.includes(barcodeColumn)) {
          const selectedIndex = selected.indexOf(barcodeColumn);
          const barcode = row[selectedIndex];
          const status = this.isShortBarcode(barcode)
            ? "SHORT - NEEDS REVIEW"
            : "OK";
          return [...row, status];
        }
        return [...row, "N/A"];
      });
    }

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

  copyGoogleSheetsFormulas() {
    const data = this.processedData();
    const formulas = data
      .map((row) => row.filter((cell) => cell.startsWith("=")))
      .filter((row) => row.length > 0);

    if (formulas.length === 0) {
      alert("No formulas found in processed data");
      return;
    }

    const formulaText = formulas.map((row) => row.join("\t")).join("\n");
    navigator.clipboard.writeText(formulaText).then(() => {
      alert(
        "Formulas copied to clipboard! You can paste them into Google Sheets."
      );
    });
  }

  // Helper methods
  getCellReference(row: number, col: number): string {
    let colString = "";
    while (col > 0) {
      col--;
      colString = String.fromCharCode(65 + (col % 26)) + colString;
      col = Math.floor(col / 26);
    }
    return `${colString}${row}`;
  }

  matchCategory(text: string): string {
    text = text.toLowerCase();
    for (const category of this.categories) {
      if (text.includes(category.name.toLowerCase())) {
        return category.name;
      }
    }
    return "Other";
  }

  matchSubcategory(text: string, category: string): string {
    text = text.toLowerCase();
    const categoryObj = this.categories.find((c) => c.name === category);
    if (categoryObj) {
      for (const subcategory of categoryObj.subcategories) {
        if (text.includes(subcategory.toLowerCase())) {
          return subcategory;
        }
      }
    }
    return "General";
  }

  findBarcodeColumn(): number {
    const headers = this.headers();
    return headers.findIndex(
      (header) =>
        header.toLowerCase().includes("barcode") ||
        header.toLowerCase().includes("upc") ||
        header.toLowerCase().includes("sku")
    );
  }

  isBarcodeColumn(columnIndex: number): boolean {
    return columnIndex === this.findBarcodeColumn();
  }

  isShortBarcode(barcode: string): boolean {
    // Consider barcodes shorter than 8 digits as "short"
    return barcode != null && barcode.length < 8;
  }
}
