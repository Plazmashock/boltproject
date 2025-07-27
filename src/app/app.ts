import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { DragDropModule, CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

interface ImageInfo {
  id: number;
  fileName: string;
  url: string;
  thumbUrl: string;
  category: string;
  file: File;
}

interface RowImage {
  id: number;
  fileName: string;
  url: string;
  thumbUrl: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  readonly #meta = inject(Meta);
  readonly #titleService = inject(Title);

  readonly #csvData = signal<string[][]>([]);
  readonly #headers = signal<string[]>([]);
  readonly #fileName = signal<string>('');
  readonly #selectedColumns = signal<number[]>([]);
  #selectedMode = signal<'3p' | 'provider' | null>(null);
  #processedData = signal<string[][]>([]);
  #processedHeaders = signal<string[]>([]);
  #showImageManagement = signal<boolean>(false);
  #validateBarcodes = signal<boolean>(false);
  #selectedBarcodeColumn = signal<string>('');
  #rowImageMap = signal<Record<number, RowImage>>({});
  readonly #images = signal<ImageInfo[]>([]);
  readonly #isUploading = signal<boolean>(false);
  readonly #uploadProgress = signal<{current: number, total: number}>({current: 0, total: 0});
  readonly #imageSearchQuery = signal<string>('');
  readonly #isDragging = signal<boolean>(false);
  readonly #activeDropdownIndex = signal<number | null>(null);
  readonly #selectedColumn = signal<number>(-1);
  readonly #showImageSelection = signal<boolean>(false);
  readonly #selectedMatchingColumn = signal<string>('');
  readonly #matchingResults = signal<string>('');

  // Computed signals for template access
  readonly csvData = computed(() => this.#csvData());
  readonly headers = computed(() => this.#headers());
  readonly fileName = computed(() => this.#fileName());
  readonly selectedColumns = computed(() => this.#selectedColumns());
  readonly processedData = computed(() => this.#processedData());
  readonly processedHeaders = computed(() => this.#processedHeaders());
  readonly mode = computed(() => this.#selectedMode());
  readonly showImageManagement = computed(() => this.mode() === 'provider');
  readonly validateBarcodes = computed(() => this.#validateBarcodes());
  readonly selectedBarcodeColumn = computed(() => this.#selectedBarcodeColumn());
  readonly rowImageMap = computed(() => this.#rowImageMap());
  readonly images = computed(() => this.#images());
  readonly isUploading = computed(() => this.#isUploading());
  readonly uploadProgress = computed(() => this.#uploadProgress());
  readonly imageSearchQuery = computed(() => this.#imageSearchQuery());
  readonly selectedMatchingColumn = computed(() => this.#selectedMatchingColumn());
  readonly matchingResults = computed(() => this.#matchingResults());
  readonly filteredImages = computed(() => {
    const query = this.#imageSearchQuery().toLowerCase();
    if (!query) return this.#images();
    return this.#images().filter(img => 
      img.fileName.toLowerCase().includes(query) || 
      img.category.toLowerCase().includes(query)
    );
  });
  readonly isDragging = computed(() => this.#isDragging());
  readonly activeDropdownIndex = computed(() => this.#activeDropdownIndex());
  readonly selectedColumn = computed(() => this.#selectedColumn());
  readonly showImageSelection = computed(() => this.#showImageSelection());

  setMode = (mode: '3p' | 'provider'): void => {
    this.#selectedMode.set(mode);
    // Reset selections when changing modes
    this.#selectedColumns.set([]);
    this.#showImageManagement.set(mode === 'provider');
    this.#validateBarcodes.set(false);
    this.#selectedBarcodeColumn.set('');
  };

  clearMode = (): void => {
    this.#selectedMode.set(null);
    // Reset all mode-specific settings
    this.#selectedColumns.set([]);
    this.#showImageManagement.set(false);
    this.#validateBarcodes.set(false);
    this.#selectedBarcodeColumn.set('');
    this.#processedData.set([]);
    this.#processedHeaders.set([]);
  };

  ngOnInit = (): void => {
    this.#setSeoMetaTags();
  };

  #setSeoMetaTags = (): void => {
    this.#titleService.setTitle('Toolkit for WMS - Professional Data Processing Tool');
    this.#meta.addTags([
      { 
        name: 'description', 
        content: 'Professional WMS toolkit with CSV processing, column selection and data export capabilities.'
      },
      {
        name: 'keywords',
        content: 'WMS toolkit, CSV processor, column selector, data export, file processing, warehouse management'
      }
    ]);
  };

  uploadFile = async (event: Event): Promise<void> => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.#fileName.set(file.name);
    const fileExtension = file.name.toLowerCase().split('.').pop();

    try {
      if (fileExtension === 'csv') {
        await this.#handleCsvFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        await this.#handleExcelFile(file);
      } else {
        alert('Please select a valid CSV or Excel file (.csv, .xlsx, .xls)');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    }
  };

  #handleExcelFile = async (file: File): Promise<void> => {
    // For now, show a message that Excel support is coming soon
    // In a real implementation, you would use a library like xlsx to parse Excel files
    alert('Excel file support is coming soon! Please convert your file to CSV format for now.');
    
    // Reset the file input
    this.#fileName.set('');
  };

  #handleCsvFile = async (file: File): Promise<void> => {
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    let offset = 0;
    let csvText = '';

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string ?? '');
        reader.readAsText(chunk);
      });
      csvText += text;
      offset += CHUNK_SIZE;
    }
    
    void this.#parseCsv(csvText);
  };

  #parseCsv = (csvText: string): void => {
    const BATCH_SIZE = 1000; // Process 1000 lines at a time
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) return;

    // Headers are always processed immediately
    const headers = this.#parseCSVLine(lines[0]);
    this.#headers.set(headers);

    // Process the rest in batches
    const allData: string[][] = [];
    const totalBatches = Math.ceil((lines.length - 1) / BATCH_SIZE);
    
    // Process first batch immediately
    const firstBatchEnd = Math.min(BATCH_SIZE + 1, lines.length);
    allData.push(...lines.slice(1, firstBatchEnd).map(line => this.#parseCSVLine(line)));
    
    // Schedule remaining batches
    if (lines.length > firstBatchEnd) {
      let currentBatch = 1;
      
      const processNextBatch = () => {
        const start = currentBatch * BATCH_SIZE + 1;
        const end = Math.min(start + BATCH_SIZE, lines.length);
        
        const batchData = lines.slice(start, end).map(line => this.#parseCSVLine(line));
        allData.push(...batchData);
        
        currentBatch++;
        
        // Update progress
        const progress = (currentBatch / totalBatches) * 100;
        console.log(`Processing CSV: ${Math.round(progress)}%`);
        
        if (currentBatch < totalBatches) {
          // Schedule next batch with requestAnimationFrame for better UI responsiveness
          requestAnimationFrame(processNextBatch);
        } else {
          // All batches processed
          this.#csvData.set(allData);
        }
      };
      
      requestAnimationFrame(processNextBatch);
    } else {
      this.#csvData.set(allData);
    }
  };

  #parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    const chars = Array.from(line);
    const len = chars.length;
    let inQuotes = false;
    let i = 0;
    const builder: string[] = [];

    while (i < len) {
      const char = chars[i];
      
      switch (char) {
        case '"':
          if (inQuotes && chars[i + 1] === '"') {
            builder.push('"');
            i++;
          } else {
            inQuotes = !inQuotes;
          }
          break;
        
        case ',':
          if (!inQuotes) {
            result.push(builder.join('').trim());
            builder.length = 0;
          } else {
            builder.push(char);
          }
          break;
        
        default:
          builder.push(char);
      }
      i++;
    }

    result.push(builder.join('').trim());
    return result;
  };

  toggleColumn = (columnIndex: number, event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (!target) return;

    const isChecked = target.checked;
    const current = this.#selectedColumns();

    if (isChecked) {
      this.#selectedColumns.update(cols => [...cols, columnIndex]);
    } else {
      this.#selectedColumns.update(cols => 
        cols.filter((index) => index !== columnIndex)
      );
    }
  };

  downloadProcessedData = (): void => {
    const headers = this.processedHeaders();
    const data = this.processedData();

    if (!headers?.length || !data?.length) return;

    const csvContent = this.#generateCsvContent(headers, data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    void this.#downloadFile(blob, `processed_${this.fileName()}`);
  };

  #generateCsvContent = (headers: string[], data: string[][]): string => {
    return [
      headers.map(this.#processCsvCell).join(','),
      ...data.map(row => row.map(this.#processCsvCell).join(','))
    ].join('\n');
  };

  #processCsvCell = (cell: string): string => {
    // Convert to string and handle null/undefined
    const cellStr = cell?.toString() ?? '';
    
    // Quote if contains comma, newline, quote, or starts/ends with whitespace
    if (cellStr.includes(',') || 
        cellStr.includes('\n') || 
        cellStr.includes('\r') || 
        cellStr.includes('"') || 
        cellStr !== cellStr.trim()) {
      // Escape existing quotes by doubling them
      return `"${cellStr.replace(/"/g, '""')}"`;
    }
    
    return cellStr;
  };

  #downloadFile = (blob: Blob, fileName: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  processData = (): void => {
    const selected = this.selectedColumns();
    if (!selected.length) return;

    const headers = this.headers();
    const csvData = this.csvData();

    const newHeaders = selected.map(i => headers[i]);
    const newData = csvData.map(row => selected.map(i => row[i]));

    this.#processedHeaders.set(newHeaders);
    this.#processedData.set(newData);
  };

    // Image management methods
  uploadImages(files: File[]) {
    if (files.length === 0) return;
    
    // Set initial upload state
    this.#isUploading.set(true);
    this.#uploadProgress.set({current: 0, total: files.length});
    
    // Upload files sequentially to avoid API rate limits
    this.#uploadFilesSequentially(files, 0);
  }

  async #uploadFilesSequentially(files: File[], index: number) {
    if (index >= files.length) {
      // All files uploaded
      this.#isUploading.set(false);
      this.#uploadProgress.set({current: 0, total: 0});
      return;
    }

    try {
      await this.#uploadToImgBB(files[index]);
      // Update progress
      this.#uploadProgress.update(progress => ({
        ...progress,
        current: index + 1
      }));
      // Upload next file
      this.#uploadFilesSequentially(files, index + 1);
    } catch (error) {
      console.error(`Failed to upload ${files[index].name}:`, error);
      // Continue with next file even if one fails
      this.#uploadProgress.update(progress => ({
        ...progress,
        current: index + 1
      }));
      this.#uploadFilesSequentially(files, index + 1);
    }
  }

  async #uploadToImgBB(file: File) {
    const id = Date.now() + Math.random();
    
    // Set uploading state
    this.#isUploading.set(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      // ImgBB API key
      const API_KEY = 'af933ff7307286ddc1359edf35cf678e';
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`ImgBB upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const newImage: ImageInfo = {
          id,
          fileName: file.name,
          url: data.data.url,
          thumbUrl: data.data.thumb.url,
          category: 'Uncategorized',
          file
        };
        
        this.#images.update(images => [...images, newImage]);
      } else {
        throw new Error('ImgBB upload failed: ' + data.error.message);
      }
    } catch (error) {
      console.error('Error uploading to ImgBB:', error);
      alert(`Failed to upload ${file.name}. Please try again.`);
    } finally {
      this.#isUploading.set(false);
    }
  }

  uploadMultipleImages(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.uploadImages(files);
    }
  }

  openImageAssignment(rowIndex: number) {
    this.#selectedColumn.set(rowIndex);
    this.#showImageSelection.set(true);
  }

  assignImageToRow(image: ImageInfo) {
    const rowIndex = this.#selectedColumn();
    if (rowIndex !== -1) {
      this.#rowImageMap.update(map => ({
        ...map,
        [rowIndex]: { id: image.id, fileName: image.fileName, url: image.url, thumbUrl: image.thumbUrl }
      }));
      this.#showImageSelection.set(false);
      this.#selectedColumn.set(-1);
    }
  }

  closeImageSelection() {
    this.#showImageSelection.set(false);
    this.#selectedColumn.set(-1);
    this.#imageSearchQuery.set(''); // Clear search when closing
  }

  updateImageSearch(query: string) {
    this.#imageSearchQuery.set(query);
  }

  removeRowImage(rowIndex: number) {
    this.#rowImageMap.update(map => {
      const newMap = { ...map };
      delete newMap[rowIndex];
      return newMap;
    });
  }

  removeImage(id: number) {
    this.#images.update(images => images.filter(img => img.id !== id));
    // Also remove from row mappings
    this.#rowImageMap.update(map => {
      const newMap = { ...map };
      Object.keys(newMap).forEach(key => {
        if (newMap[parseInt(key)].id === id) {
          delete newMap[parseInt(key)];
        }
      });
      return newMap;
    });
  }

  updateImageCategory(id: number, category: string) {
    this.#images.update(images => 
      images.map(img => 
        img.id === id ? { ...img, category } : img
      )
    );
  }

  copyImageUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  updateMatchingColumn(column: string) {
    this.#selectedMatchingColumn.set(column);
  }

  executeImageMatching() {
    const selectedColumnIndex = this.#selectedMatchingColumn();
    const csvData = this.#csvData();
    const headers = this.#headers();
    const images = this.#images();

    if (!selectedColumnIndex || !csvData.length || !headers.length || !images.length) {
      this.#matchingResults.set('No data available for matching.');
      return;
    }

    const columnIndex = parseInt(selectedColumnIndex);
    if (isNaN(columnIndex) || columnIndex < 0 || columnIndex >= headers.length) {
      this.#matchingResults.set('Invalid column selection.');
      return;
    }

    let matchCount = 0;
    const newRowImageMap = { ...this.#rowImageMap() };

    // Clear existing automatic matches (keep manual assignments)
    // We'll overwrite any existing matches for now
    csvData.forEach((row, rowIndex) => {
      const cellValue = row[columnIndex]?.trim().toLowerCase();
      if (!cellValue) return;

      // Find matching image by filename (without extension)
      const matchingImage = images.find(img => {
        const imageNameWithoutExt = img.fileName.replace(/\.[^/.]+$/, '').toLowerCase();
        return imageNameWithoutExt === cellValue;
      });

      if (matchingImage) {
        newRowImageMap[rowIndex] = {
          id: matchingImage.id,
          fileName: matchingImage.fileName,
          url: matchingImage.url,
          thumbUrl: matchingImage.thumbUrl
        };
        matchCount++;
      }
    });

    // Update the row image map with all matches
    this.#rowImageMap.set(newRowImageMap);

    // Set results message
    const totalRows = csvData.length;
    this.#matchingResults.set(
      `Matching completed: ${matchCount} out of ${totalRows} rows matched with images.`
    );
  }

  exportImages(format: 'json' | 'csv') {
    const data = this.#images();
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const csv = this.convertImagesToCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  private convertImagesToCSV(images: ImageInfo[]): string {
    const headers = ['ID', 'File Name', 'Category', 'URL'];
    const rows = images.map(img => [
      img.id.toString(),
      img.fileName,
      img.category,
      img.url
    ]);
    
    return [
      headers.map(this.#processCsvCell).join(','),
      ...rows.map(row => row.map(this.#processCsvCell).join(','))
    ].join('\n');
  }

  onImageDrop(event: CdkDragDrop<ImageInfo[]>) {
    const images = this.#images();
    const updatedImages = [...images];
    moveItemInArray(updatedImages, event.previousIndex, event.currentIndex);
    this.#images.set(updatedImages);
  }

  // Drag and drop methods
  dropColumn = (event: CdkDragDrop<string[]>): void => {
    const { previousIndex, currentIndex } = event;
    
    // Update headers
    this.#headers.update(headers => {
      const result = [...headers];
      const [removed] = result.splice(previousIndex, 1);
      result.splice(currentIndex, 0, removed);
      return result;
    });

    // Update CSV data
    this.#csvData.update(data => {
      return data.map(row => {
        const newRow = [...row];
        const [removed] = newRow.splice(previousIndex, 1);
        newRow.splice(currentIndex, 0, removed);
        return newRow;
      });
    });
  };

  // Image management UI methods
  updateValidateBarcodes = (value: boolean): void => {
    this.#validateBarcodes.set(value);
    this.updateProcessingOptions();
  };

  updateShowImageManagement = (value: boolean): void => {
    this.#showImageManagement.set(value);
  };

  updateSelectedBarcodeColumn = (value: string): void => {
    this.#selectedBarcodeColumn.set(value);
  };

  handleDragEnter = (event: DragEvent, columnIndex: number): void => {
    event.preventDefault();
    this.#isDragging.set(true);
  };

  handleDragLeave = (event: DragEvent): void => {
    event.preventDefault();
    this.#isDragging.set(false);
  };

  handleDrop = (event: DragEvent, row: string[], columnIndex: number): void => {
    event.preventDefault();
    this.#isDragging.set(false);
  };

  copyToClipboard = (text: string): void => {
    void navigator.clipboard.writeText(text);
  };

  isExternalImageUrlRow = (row: string[]): boolean => {
    const headers = this.headers();
    return headers.some((header, index) => 
      header === 'External image URL' && row[index]
    );
  };

  drop = (event: CdkDragDrop<ImageInfo[]>): void => {
    const { previousIndex, currentIndex } = event;
    this.#images.update(images => {
      const result = [...images];
      const [removed] = result.splice(previousIndex, 1);
      result.splice(currentIndex, 0, removed);
      return result;
    });
  };

  onDragRow = (event: CdkDragDrop<string[]>): void => {
    const { previousIndex, currentIndex } = event;
    this.#processedData.update(data => {
      const result = [...data];
      const [removed] = result.splice(previousIndex, 1);
      result.splice(currentIndex, 0, removed);
      return result;
    });
  };

  toggleImageUrlDropdown = (index: number): void => {
    this.#activeDropdownIndex.update(current => current === index ? null : index);
  };

  selectImageUrl = (row: string[], columnIndex: number, url: string): void => {
    const data = this.#processedData();
    const rowIndex = data.findIndex(r => r === row);
    if (rowIndex === -1) return;

    const newData = [...data];
    const newRow = [...row];
    newRow[columnIndex] = url;
    newData[rowIndex] = newRow;
    
    this.#processedData.set(newData);
    this.#activeDropdownIndex.set(null);
  };

  updateProcessingOptions = (): void => {
    this.processData();
  };

  exportAsJSON = (): void => {
    const jsonContent = JSON.stringify(this.images(), null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    void this.#downloadFile(blob, 'images.json');
  };

  exportAsCSV = (): void => {
    const headers = ['File Name', 'Category', 'URL', 'Thumbnail URL'];
    const rows = this.images().map(img => [
      img.fileName,
      img.category,
      img.url,
      img.thumbUrl
    ]);
    
    const csvContent = [
      headers.map(this.#processCsvCell).join(','),
      ...rows.map(row => row.map(this.#processCsvCell).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    void this.#downloadFile(blob, 'images.csv');
  };

  // Provider Menu specific methods
  processProviderData = (): void => {
    // For provider mode, we process all data (no column selection needed)
    const headers = this.headers();
    const csvData = this.csvData();
    
    // Process all columns for provider mode
    this.#processedHeaders.set(headers);
    this.#processedData.set(csvData);
  };

  downloadProviderCSV = (): void => {
    const headers = this.processedHeaders();
    const data = this.processedData();
    const rowImages = this.rowImageMap();

    if (!headers?.length || !data?.length) return;

    // Create modified data with image links
    const modifiedData = data.map((row, rowIndex) => {
      const rowWithImage = [...row];
      
      // If this row has an assigned image, add the image link
      if (rowImages[rowIndex]) {
        // Add image link as the last column
        rowWithImage.push(rowImages[rowIndex].url);
      } else {
        // Add empty string if no image assigned
        rowWithImage.push('');
      }
      
      return rowWithImage;
    });

    // Add "Image Link" to headers
    const modifiedHeaders = [...headers, 'Image Link'];

    const csvContent = this.#generateCsvContent(modifiedHeaders, modifiedData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    void this.#downloadFile(blob, `provider_${this.fileName()}`);
  };

  onRowClick = (rowIndex: number): void => {
    // Only for provider mode - allow clicking anywhere on row to assign image
    if (this.mode() === 'provider') {
      this.openImageAssignment(rowIndex);
    }
  };

  stopPropagation = (event: Event): void => {
    event.stopPropagation();
  };
}