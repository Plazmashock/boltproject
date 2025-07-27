import { signal } from "@angular/core";

export class App {
  csvData = signal<string[][]>([]);
  headers = signal<string[]>([]);
  fileName = signal<string>("");
  selectedColumns = signal<number[]>([]);
  processedData = signal<string[][]>([]);
  processedHeaders = signal<string[]>([]);
  validateBarcodes = false;
  selectedBarcodeColumn = signal<string>('');
  protected readonly showImageManagement = signal(false);
  protected readonly columnImageMap = signal<{[columnIndex: number]: {
    imageId: string;
    url: string;
    thumbUrl: string;
    fileName: string;
  }}>({});

  processData(): void {
    const that = this; // Preserve this context
    const selected = that.selectedColumns();
    if (selected.length === 0) return;

    const originalHeaders = that.headers();
    const originalData = that.csvData();
    const newHeaders: string[] = [];
    const newData: string[][] = [];

    // Process headers first
    selected.forEach((columnIndex) => {
      const header = originalHeaders[columnIndex];
      if (header === "შტრიხკოდი") {
        newHeaders.push("Barcode", "SKU");
      } else {
        newHeaders.push(header);
      }
    });

    // Add validation columns if barcode validation is enabled
    // Find შტრიხკოდი column for barcode validation
    const barcodeColumnIndex = originalHeaders.findIndex(
      (header) => header === "შტრიხკოდი"
    );
    const hasBarcodeColumn = barcodeColumnIndex !== -1 && selected.includes(barcodeColumnIndex);

    // If barcode validation is enabled, add the measurement columns
    if (this.validateBarcodes && hasBarcodeColumn) {
      newHeaders.push("Product main measure unit");
      newHeaders.push("Product main measure value");
      newHeaders.push("Is measured");
    }

    // Add External image URL header if enabled
    if (this.showImageManagement()) {
      newHeaders.push("External image URL");
    }

    // Process data rows
    originalData.forEach((row) => {
      const rowData: string[] = [];

      // Process selected columns
      selected.forEach((columnIndex) => {
        const header = originalHeaders[columnIndex];
        const value = row[columnIndex] || "";
        if (header === "შტრიხკოდი") {
          rowData.push(value, value); // Barcode and SKU
        } else {
          rowData.push(value);
        }
      });

      // Add validation data if barcode validation is enabled
      if (this.validateBarcodes && hasBarcodeColumn) {
        const barcodeValue = row[barcodeColumnIndex] || "";
        // Check if it's the შტრიხკოდი column and has 10 or fewer characters
        if (originalHeaders[barcodeColumnIndex] === "შტრიხკოდი" && barcodeValue.length <= 10) {
          rowData.push("kg", "0,1", "True");
        } else {
          rowData.push("", "", "False");
        }
      }

      // Add image URL if image management is enabled
      if (this.showImageManagement()) {
        const imageMap = this.columnImageMap();
        // Find first image that matches any selected column
        const matchingImage = selected.reduce<{url: string; thumbUrl: string; fileName: string} | null>(
          (found, colIndex) => found || imageMap[colIndex] || null,
          null
        );

        if (matchingImage) {
          rowData.push(matchingImage.url);
        } else {
          rowData.push("");
        }
      }

      newData.push(rowData);
    });

    this.processedHeaders.set(newHeaders);
    this.processedData.set(newData);
  }
}
