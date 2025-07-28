import { Component, OnInit, ChangeDetectionStrategy, computed, signal, inject, effect, PLATFORM_ID, afterNextRender } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

interface DataStats {
  totalRows: number;
  totalColumns: number;
  emptyColumns: number;
  duplicateRows: number;
  maxRowLength: number;
  fileSize: string;
}

interface ProcessingHistory {
  id: string;
  fileName: string;
  timestamp: Date;
  columnsProcessed: number;
  totalRows: number;
  mode: string;
}

interface ErrorState {
  fileError: string | null;
  processingError: string | null;
  networkError: string | null;
  validationError: string | null;
}

interface ColumnDataType {
  type: 'text' | 'number' | 'date' | 'boolean';
  confidence: number;
}

interface DataTransformation {
  columnIndex: number;
  type: 'uppercase' | 'lowercase' | 'capitalize' | 'formatDate' | 'formatNumber';
}

interface FindReplaceOperation {
  find: string;
  replace: string;
  columnIndex: number;
  caseSensitive: boolean;
}

interface ColumnSort {
  columnIndex: number;
  direction: 'asc' | 'desc';
}

interface ColumnFilter {
  columnIndex: number;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notEmpty' | 'isEmpty';
  value: string;
}

interface CleaningOptions {
  trimWhitespace: boolean;
  removeDuplicates: boolean;
}

interface DataPreview {
  processedRows: string[][];
  totalRows: number;
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
  private readonly platformId = inject(PLATFORM_ID);
  private meta = inject(Meta);
  private title = inject(Title);

  // Browser check helper
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && typeof document !== 'undefined';
  }

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

  // New enhancement signals
  readonly #errorState = signal<ErrorState>({
    fileError: null,
    processingError: null,
    networkError: null,
    validationError: null
  });
  readonly #isDarkMode = signal<boolean>(false);
  readonly #processingHistory = signal<ProcessingHistory[]>([]);
  readonly #isProcessing = signal<boolean>(false);
  readonly #showImageMatching = signal<boolean>(false);
  readonly #fileSize = signal<number>(0);
  readonly #processingProgress = signal<number>(0);

  // Enhanced data processing signals for Provider Menu
  readonly #columnDataTypes = signal<ColumnDataType[]>([]);
  readonly #selectedTransformation = signal<DataTransformation>({ columnIndex: -1, type: 'uppercase' });
  readonly #appliedTransformations = signal<DataTransformation[]>([]);
  readonly #findReplaceOperation = signal<FindReplaceOperation>({ find: '', replace: '', columnIndex: -1, caseSensitive: false });
  readonly #columnSort = signal<ColumnSort>({ columnIndex: -1, direction: 'asc' });
  readonly #columnFilter = signal<ColumnFilter>({ columnIndex: -1, operator: 'contains', value: '' });
  readonly #appliedFilters = signal<ColumnFilter[]>([]);
  readonly #cleaningOptions = signal<CleaningOptions>({ trimWhitespace: false, removeDuplicates: false });
  readonly #dataPreview = signal<DataPreview>({ processedRows: [], totalRows: 0 });

  // File validation constants
  readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  readonly MAX_ROWS_WARNING = 10000;
  readonly SUPPORTED_FORMATS = ['.csv', '.xlsx', '.xls'];

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

  // New computed signals for enhancements
  readonly errorState = computed(() => this.#errorState());
  readonly isDarkMode = computed(() => this.#isDarkMode());
  readonly processingHistory = computed(() => this.#processingHistory());
  readonly isProcessing = computed(() => this.#isProcessing());
  readonly showImageMatching = computed(() => this.#showImageMatching());
  readonly processingProgress = computed(() => this.#processingProgress());
  
  // Enhanced data processing computed signals
  readonly columnDataTypes = computed(() => this.#columnDataTypes());
  readonly selectedTransformation = computed(() => this.#selectedTransformation());
  readonly appliedTransformations = computed(() => this.#appliedTransformations());
  readonly findReplaceOperation = computed(() => this.#findReplaceOperation());
  readonly columnSort = computed(() => this.#columnSort());
  readonly columnFilter = computed(() => this.#columnFilter());
  readonly appliedFilters = computed(() => this.#appliedFilters());
  readonly cleaningOptions = computed(() => this.#cleaningOptions());
  readonly dataPreview = computed(() => this.#dataPreview());
  
  readonly dataStats = computed((): DataStats | null => {
    const data = this.#csvData();
    const headers = this.#headers();
    
    if (!data.length || !headers.length) return null;
    
    const emptyColumns = headers.reduce((count, _, index) => {
      const columnEmpty = data.every(row => !row[index]?.trim());
      return columnEmpty ? count + 1 : count;
    }, 0);
    
    const duplicateRows = this.#countDuplicateRows(data);
    const maxRowLength = Math.max(...data.map(row => row.length));
    
    return {
      totalRows: data.length,
      totalColumns: headers.length,
      emptyColumns,
      duplicateRows,
      maxRowLength,
      fileSize: this.#formatFileSize(this.#fileSize())
    };
  });

  // Computed signal to check if user has unsaved data/work
  readonly hasUnsavedData = computed((): boolean => {
    return this.#csvData().length > 0 || 
           this.#images().length > 0 || 
           this.#isProcessing() || 
           this.#isUploading() ||
           this.#selectedColumns().length > 0 ||
           this.#processedData().length > 0;
  });

  constructor() {
    // Use afterNextRender to ensure we're in the browser
    afterNextRender(() => {
      // Initialize dark mode from localStorage
      const savedDarkMode = localStorage.getItem('toolkit-dark-mode');
      if (savedDarkMode === 'true') {
        this.#isDarkMode.set(true);
      }
      
      // Load processing history from localStorage
      this.#loadProcessingHistory();
      
      // Set up beforeunload warning to prevent accidental data loss
      this.#setupBeforeUnloadWarning();

      // Apply dark mode class effect - only in browser
      effect(() => {
        const isDark = this.#isDarkMode();
        console.log('Dark mode effect triggered, isDark:', isDark);
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('toolkit-dark-mode', isDark.toString());
        console.log('Applied dark class to documentElement, classList:', document.documentElement.classList.toString());
      });
    });
  }

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
    this.title.setTitle('Toolkit for WMS - Professional Data Processing Tool');
    this.meta.addTags([
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

    // Clear previous errors
    this.#clearErrors();

    // Enhanced file validation
    const validationError = this.#validateFile(file);
    if (validationError) {
      this.#setError('fileError', validationError);
      input.value = ''; // Reset file input
      return;
    }

    this.#fileName.set(file.name);
    this.#fileSize.set(file.size);
    this.#isProcessing.set(true);
    this.#processingProgress.set(0);

    const fileExtension = file.name.toLowerCase().split('.').pop();

    try {
      if (fileExtension === 'csv') {
        await this.#handleCsvFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        await this.#handleExcelFile(file);
      } else {
        this.#setError('fileError', 'Please select a valid CSV or Excel file (.csv, .xlsx, .xls)');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      this.#setError('processingError', 'Error processing file. Please try again.');
    } finally {
      this.#isProcessing.set(false);
      this.#processingProgress.set(100);
    }
  };

  #validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return `File size (${this.#formatFileSize(file.size)}) exceeds maximum allowed size (${this.#formatFileSize(this.MAX_FILE_SIZE)})`;
    }

    // Check file extension
    const extension = '.' + file.name.toLowerCase().split('.').pop();
    if (!this.SUPPORTED_FORMATS.includes(extension)) {
      return `Unsupported file format. Please use: ${this.SUPPORTED_FORMATS.join(', ')}`;
    }

    // Check file name validity
    if (file.name.length > 255) {
      return 'File name is too long (maximum 255 characters)';
    }

    return null;
  };

  #clearErrors = (): void => {
    this.#errorState.set({
      fileError: null,
      processingError: null,
      networkError: null,
      validationError: null
    });
  };

  #setError = (type: keyof ErrorState, message: string): void => {
    this.#errorState.update(state => ({
      ...state,
      [type]: message
    }));
  };

  #formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  #countDuplicateRows = (data: string[][]): number => {
    const seen = new Set<string>();
    let duplicates = 0;
    
    for (const row of data) {
      const rowString = row.join('|'); // Use pipe as delimiter to avoid conflicts
      if (seen.has(rowString)) {
        duplicates++;
      } else {
        seen.add(rowString);
      }
    }
    
    return duplicates;
  };

  #loadProcessingHistory = (): void => {
    try {
      const saved = localStorage.getItem('toolkit-processing-history');
      if (saved) {
        const history = JSON.parse(saved) as ProcessingHistory[];
        this.#processingHistory.set(history);
      }
    } catch (error) {
      console.error('Error loading processing history:', error);
    }
  };

  #saveProcessingHistory = (entry: Omit<ProcessingHistory, 'id'>): void => {
    const newEntry: ProcessingHistory = {
      ...entry,
      id: Date.now().toString()
    };
    
    this.#processingHistory.update(history => {
      const updated = [newEntry, ...history].slice(0, 10); // Keep only last 10 entries
      localStorage.setItem('toolkit-processing-history', JSON.stringify(updated));
      return updated;
    });
  };

  #setupBeforeUnloadWarning = (): void => {
    const handleBeforeUnload = (event: BeforeUnloadEvent): string | undefined => {
      if (this.hasUnsavedData()) {
        // Modern browsers will show their own message, but we need to prevent default
        event.preventDefault();
        // Some browsers require returnValue to be set
        event.returnValue = 'You have unsaved data. Are you sure you want to leave?';
        return 'You have unsaved data. Are you sure you want to leave?';
      }
      return undefined;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up listener when component is destroyed (though unlikely in this case)
    // In a real app, you'd implement OnDestroy and clean up there
  };

  // Toggle dark mode
  toggleDarkMode = (): void => {
    console.log('Toggle dark mode clicked, current state:', this.#isDarkMode());
    this.#isDarkMode.update(current => {
      const newValue = !current;
      console.log('Updating dark mode to:', newValue);
      return newValue;
    });
  };

  // Toggle image matching section
  toggleImageMatching = (): void => {
    this.#showImageMatching.update(current => !current);
  };

  // Clear error manually
  clearError = (type: keyof ErrorState): void => {
    this.#errorState.update(state => ({
      ...state,
      [type]: null
    }));
  };

  #handleExcelFile = async (file: File): Promise<void> => {
    // For now, show a message that Excel support is coming soon
    // In a real implementation, you would use a library like xlsx to parse Excel files
    alert('Excel file support is coming soon! Please convert your file to CSV format for now.');
    
    // Reset the file input
    this.#fileName.set('');
  };

  #handleCsvFile = async (file: File): Promise<void> => {
    try {
      const CHUNK_SIZE = 64 * 1024; // 64KB chunks
      let offset = 0;
      let csvText = '';

      // Read file in chunks with progress
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string ?? '');
          reader.onerror = () => reject(new Error('Failed to read file chunk'));
          reader.readAsText(chunk);
        });
        
        csvText += text;
        offset += CHUNK_SIZE;
        
        // Update progress
        const progress = Math.min((offset / file.size) * 50, 50); // First 50% for reading
        this.#processingProgress.set(progress);
      }
      
      await this.#parseCsv(csvText);
      
      // Show warning for large datasets
      const rowCount = this.#csvData().length;
      if (rowCount > this.MAX_ROWS_WARNING) {
        this.#setError('validationError', 
          `Large dataset detected (${rowCount.toLocaleString()} rows). Processing may be slower than usual.`);
      }
      
    } catch (error) {
      throw new Error(`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  #parseCsv = async (csvText: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const BATCH_SIZE = 1000; // Process 1000 lines at a time
        const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
        
        if (lines.length === 0) {
          reject(new Error('CSV file appears to be empty'));
          return;
        }

        // Validate CSV structure
        if (lines.length === 1) {
          reject(new Error('CSV file contains only headers. Please include data rows.'));
          return;
        }

        // Headers are always processed immediately
        const headers = this.#parseCSVLine(lines[0]);
        if (headers.length === 0) {
          reject(new Error('No valid headers found in CSV file'));
          return;
        }
        
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
            try {
              const start = currentBatch * BATCH_SIZE + 1;
              const end = Math.min(start + BATCH_SIZE, lines.length);
              
              const batchData = lines.slice(start, end).map(line => this.#parseCSVLine(line));
              allData.push(...batchData);
              
              currentBatch++;
              
              // Update progress (50% to 100% for parsing)
              const parseProgress = (currentBatch / totalBatches) * 50;
              this.#processingProgress.set(50 + parseProgress);
              
              if (currentBatch < totalBatches) {
                // Schedule next batch with requestAnimationFrame for better UI responsiveness
                requestAnimationFrame(processNextBatch);
              } else {
                // All batches processed
                this.#csvData.set(allData);
                this.#processingProgress.set(100);
                resolve();
              }
            } catch (error) {
              reject(new Error(`Error processing CSV batch: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          };
          
          requestAnimationFrame(processNextBatch);
        } else {
          this.#csvData.set(allData);
          this.#processingProgress.set(100);
          resolve();
        }
      } catch (error) {
        reject(new Error(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
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

    if (!headers?.length || !data?.length) {
      this.#setError('processingError', 'No processed data available for download');
      return;
    }

    try {
      const csvContent = this.#generateCsvContent(headers, data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      void this.#downloadFile(blob, `processed_${this.fileName()}`);

      // Save to processing history
      this.#saveProcessingHistory({
        fileName: this.fileName(),
        timestamp: new Date(),
        columnsProcessed: headers.length,
        totalRows: data.length,
        mode: this.mode() || 'unknown'
      });

    } catch (error) {
      console.error('Error generating CSV:', error);
      this.#setError('processingError', 'Failed to generate CSV file for download');
    }
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
    
    // Initialize enhanced data processing
    if (csvData.length > 0 && headers.length > 0) {
      this.inferDataTypes();
      this.#updatePreview();
    }
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

  // Scroll to specific section in Provider Menu
  scrollToSection = (sectionId: string): void => {
    if (!this.isBrowser) return;
    
    // For Provider mode, scroll to the enhanced data processing section
    if (this.mode() === 'provider') {
      // Look for the section by class or id
      const element = document.querySelector(`[data-section="${sectionId}"]`) || 
                     document.querySelector('.enhanced-data-processing');
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Data Processing Dialog Methods
  openTransformDialog = (): void => {
    // Toggle transform section visibility or open a modal
    this.scrollToSection('transformations');
    // Could also trigger a modal here for better UX
  };

  openSearchReplaceDialog = (): void => {
    // Scroll to find & replace section
    this.scrollToSection('find-replace');
  };

  openSortFilterDialog = (): void => {
    // Scroll to sorting section
    this.scrollToSection('sorting');
  };

  performDataCleaning = (): void => {
    // Automatically enable common cleaning options and apply
    this.updateCleaningOption('trimWhitespace', true);
    this.updateCleaningOption('removeDuplicates', true);
    this.applyDataCleaning();
  };

  applyAllProcessing = (): void => {
    // Apply all current transformations, filters, and cleaning in sequence
    if (this.cleaningOptions().trimWhitespace || this.cleaningOptions().removeDuplicates) {
      this.applyDataCleaning();
    }
    
    if (this.appliedTransformations().length > 0) {
      this.applyTransformation();
    }
    
    if (this.appliedFilters().length > 0 || this.columnSort().columnIndex !== -1) {
      this.applySorting();
    }
  };

  resetAllProcessing = (): void => {
    // Reset all processing settings to defaults
    this.#appliedTransformations.set([]);
    this.#appliedFilters.set([]);
    this.#columnSort.set({ columnIndex: -1, direction: 'asc' });
    this.#cleaningOptions.set({
      trimWhitespace: false,
      removeDuplicates: false
    });
    this.#findReplaceOperation.set({
      find: '',
      replace: '',
      columnIndex: -1,
      caseSensitive: false
    });
    this.#dataPreview.set({
      processedRows: [],
      totalRows: 0
    });
  };

  // Enhanced data processing methods for Provider Menu
  #inferDataTypes = (data: string[][], headers: string[]): ColumnDataType[] => {
    const columnTypes: ColumnDataType[] = [];
    
    headers.forEach((header, columnIndex) => {
      const samples = data.slice(0, Math.min(100, data.length)).map(row => row[columnIndex]).filter(cell => cell && cell.trim());
      
      if (samples.length === 0) {
        columnTypes.push({ type: 'text', confidence: 0 });
        return;
      }

      let numberCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      
      samples.forEach(sample => {
        const trimmed = sample.trim();
        
        // Check for boolean
        if (/^(true|false|yes|no|y|n|1|0)$/i.test(trimmed)) {
          booleanCount++;
        }
        
        // Check for number
        if (!isNaN(parseFloat(trimmed)) && isFinite(parseFloat(trimmed))) {
          numberCount++;
        }
        
        // Check for date
        const dateValue = new Date(trimmed);
        if (!isNaN(dateValue.getTime()) && trimmed.length > 5) {
          dateCount++;
        }
      });

      const total = samples.length;
      const numberRatio = numberCount / total;
      const dateRatio = dateCount / total;
      const booleanRatio = booleanCount / total;

      let type: 'text' | 'number' | 'date' | 'boolean' = 'text';
      let confidence = 0;

      if (booleanRatio > 0.8) {
        type = 'boolean';
        confidence = booleanRatio;
      } else if (numberRatio > 0.7) {
        type = 'number';
        confidence = numberRatio;
      } else if (dateRatio > 0.6) {
        type = 'date';
        confidence = dateRatio;
      } else {
        type = 'text';
        confidence = 1 - Math.max(numberRatio, dateRatio, booleanRatio);
      }

      columnTypes.push({ type, confidence });
    });

    return columnTypes;
  };

  inferDataTypes = (): void => {
    const data = this.#csvData();
    const headers = this.#headers();
    
    if (data.length === 0 || headers.length === 0) return;
    
    const columnTypes = this.#inferDataTypes(data, headers);
    this.#columnDataTypes.set(columnTypes);
  };

  // Data cleaning methods
  updateCleaningOption = (option: keyof CleaningOptions, value: boolean): void => {
    this.#cleaningOptions.update(current => ({
      ...current,
      [option]: value
    }));
    this.#updatePreview();
  };

  applyDataCleaning = (): void => {
    this.#updatePreview();
  };

  // Transformation methods
  updateTransformation = (key: keyof DataTransformation, value: any): void => {
    this.#selectedTransformation.update(current => ({
      ...current,
      [key]: value
    }));
  };

  applyTransformation = (): void => {
    const transformation = this.#selectedTransformation();
    if (transformation.columnIndex === -1 || !transformation.type) return;

    this.#appliedTransformations.update(current => [...current, transformation]);
    this.#selectedTransformation.set({ columnIndex: -1, type: 'uppercase' });
    this.#updatePreview();
  };

  removeTransformation = (index: number): void => {
    this.#appliedTransformations.update(current => 
      current.filter((_, i) => i !== index)
    );
    this.#updatePreview();
  };

  // Find & Replace methods
  updateFindReplace = (key: keyof FindReplaceOperation, value: any): void => {
    this.#findReplaceOperation.update(current => ({
      ...current,
      [key]: value
    }));
  };

  executeFindReplace = (): void => {
    const operation = this.#findReplaceOperation();
    if (!operation.find) return;

    // Apply the find/replace operation
    this.#updatePreview();
    
    // Reset the form
    this.#findReplaceOperation.set({ find: '', replace: '', columnIndex: -1, caseSensitive: false });
  };

  // Sorting methods
  updateSort = (key: keyof ColumnSort, value: any): void => {
    this.#columnSort.update(current => ({
      ...current,
      [key]: value
    }));
  };

  applySorting = (): void => {
    const sort = this.#columnSort();
    if (sort.columnIndex === -1) return;

    this.#updatePreview();
  };

  // Filtering methods
  updateFilter = (key: keyof ColumnFilter, value: any): void => {
    this.#columnFilter.update(current => ({
      ...current,
      [key]: value
    }));
  };

  applyFiltering = (): void => {
    const filter = this.#columnFilter();
    if (filter.columnIndex === -1) return;

    this.#appliedFilters.update(current => {
      // Remove existing filter for this column
      const filtered = current.filter(f => f.columnIndex !== filter.columnIndex);
      return [...filtered, filter];
    });

    this.#columnFilter.set({ columnIndex: -1, operator: 'contains', value: '' });
    this.#updatePreview();
  };

  removeFilter = (index: number): void => {
    this.#appliedFilters.update(current => 
      current.filter((_, i) => i !== index)
    );
    this.#updatePreview();
  };

  clearAllFilters = (): void => {
    this.#appliedFilters.set([]);
    this.#updatePreview();
  };

  #updatePreview = (): void => {
    let data = [...this.#csvData()];
    const headers = this.#headers();

    if (data.length === 0) {
      this.#dataPreview.set({ processedRows: [], totalRows: 0 });
      return;
    }

    // Apply transformations
    this.#appliedTransformations().forEach(transformation => {
      data = this.#applyTransformation(data, transformation);
    });

    // Apply find & replace
    const findReplace = this.#findReplaceOperation();
    if (findReplace.find) {
      data = this.#applyFindReplace(data, findReplace);
    }

    // Apply data cleaning
    const cleaning = this.#cleaningOptions();
    if (cleaning.trimWhitespace) {
      data = data.map(row => row.map(cell => cell?.trim() || ''));
    }

    if (cleaning.removeDuplicates) {
      data = this.#removeDuplicateRows(data);
    }

    // Apply filters
    this.#appliedFilters().forEach(filter => {
      data = this.#applyColumnFilter(data, filter);
    });

    // Apply sorting
    const sort = this.#columnSort();
    if (sort.columnIndex !== -1) {
      data = this.#applyColumnSort(data, sort, headers);
    }

    this.#dataPreview.set({
      processedRows: data.slice(0, 10),
      totalRows: data.length
    });
  };

  #applyTransformation = (data: string[][], transformation: DataTransformation): string[][] => {
    return data.map(row => {
      const newRow = [...row];
      const cellValue = newRow[transformation.columnIndex] || '';

      switch (transformation.type) {
        case 'uppercase':
          newRow[transformation.columnIndex] = cellValue.toUpperCase();
          break;
        case 'lowercase':
          newRow[transformation.columnIndex] = cellValue.toLowerCase();
          break;
        case 'capitalize':
          newRow[transformation.columnIndex] = cellValue.replace(/\b\w/g, l => l.toUpperCase());
          break;
        case 'formatDate':
          const date = new Date(cellValue);
          if (!isNaN(date.getTime())) {
            newRow[transformation.columnIndex] = date.toLocaleDateString();
          }
          break;
        case 'formatNumber':
          const num = parseFloat(cellValue);
          if (!isNaN(num)) {
            newRow[transformation.columnIndex] = num.toLocaleString();
          }
          break;
      }

      return newRow;
    });
  };

  #applyFindReplace = (data: string[][], operation: FindReplaceOperation): string[][] => {
    return data.map(row => {
      const newRow = [...row];
      
      if (operation.columnIndex === -1) {
        // Apply to all columns
        newRow.forEach((cell, index) => {
          const flags = operation.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(operation.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          newRow[index] = cell.replace(regex, operation.replace);
        });
      } else {
        // Apply to specific column
        const cellValue = newRow[operation.columnIndex] || '';
        const flags = operation.caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(operation.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        newRow[operation.columnIndex] = cellValue.replace(regex, operation.replace);
      }

      return newRow;
    });
  };

  #applyColumnFilter = (data: string[][], filter: ColumnFilter): string[][] => {
    return data.filter(row => {
      const cellValue = (row[filter.columnIndex] || '').toString();
      
      switch (filter.operator) {
        case 'contains':
          return cellValue.toLowerCase().includes(filter.value.toLowerCase());
        case 'equals':
          return cellValue === filter.value;
        case 'startsWith':
          return cellValue.toLowerCase().startsWith(filter.value.toLowerCase());
        case 'endsWith':
          return cellValue.toLowerCase().endsWith(filter.value.toLowerCase());
        case 'notEmpty':
          return cellValue.trim() !== '';
        case 'isEmpty':
          return cellValue.trim() === '';
        default:
          return true;
      }
    });
  };

  #applyColumnSort = (data: string[][], sort: ColumnSort, headers: string[]): string[][] => {
    const columnType = this.#columnDataTypes()[sort.columnIndex]?.type || 'text';
    
    return [...data].sort((a, b) => {
      const aValue = a[sort.columnIndex] || '';
      const bValue = b[sort.columnIndex] || '';

      let comparison = 0;

      switch (columnType) {
        case 'number':
          comparison = parseFloat(aValue) - parseFloat(bValue);
          break;
        case 'date':
          comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
          break;
        default:
          comparison = aValue.localeCompare(bValue);
      }

      return sort.direction === 'desc' ? -comparison : comparison;
    });
  };

  #removeDuplicateRows = (data: string[][]): string[][] => {
    const seen = new Set<string>();
    return data.filter(row => {
      const rowString = row.join('|');
      if (seen.has(rowString)) {
        return false;
      }
      seen.add(rowString);
      return true;
    });
  };
}