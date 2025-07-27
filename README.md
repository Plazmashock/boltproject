# 🛠️ Toolkit for WMS - Professional CSV Processing Tool

<div align="center">
  <img src="public/Bolt-Food_logo-horisontal_CMYK.png" alt="Toolkit for WMS Logo" width="300">
  
  [![Angular](https://img.shields.io/badge/Angular-20+-red.svg)](https://angular.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1+-38B2AC.svg)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## 📋 Overview

**Toolkit for WMS** is a sophisticated web-based internal tool designed for warehouse management systems to streamline CSV file processing. Built with modern Angular architecture, it provides an intuitive interface for data transformation, column mapping, image management, and export capabilities.

## ✨ Features

### 🔄 **CSV Processing**
- **Multi-format Support**: Import CSV and Excel files seamlessly
- **Intelligent Parsing**: Handles various CSV formats with quote escaping
- **Real-time Preview**: Live data preview with row counting

### 🏷️ **Header Management**
- **Smart Mapping**: Rename headers using predefined mappings (e.g., Georgian → English)
- **Column Selection**: Interactive column selection with visual feedback
- **Custom Headers**: Support for custom header transformations

### 🖼️ **Image Management**
- **Image Assignment**: Match images to specific data rows
- **Visual Preview**: Thumbnail previews with full-size modal view
- **Auto-matching**: Intelligent image-to-data matching based on column values
- **External Hosting**: Integration with ImgBB for reliable image storage

### 🎯 **Processing Modes**
- **Provider Menu Mode**: Full image assignment capabilities
- **3P Assortments Mode**: Restricted image assignment for data integrity

### 📊 **Data Export**
- **Selective Processing**: Process only selected columns
- **Clean CSV Export**: Generate properly formatted CSV files
- **Data Validation**: Ensure data integrity before export

### 🎨 **User Experience**
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Smooth Animations**: Enhanced transitions and hover effects
- **Dark/Light Themes**: Adaptive color schemes
- **Progress Indicators**: Real-time upload and processing feedback

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Angular CLI** (v20+)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd io-csv
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment configuration
   cp src/environments/environment.example.ts src/environments/environment.ts
   
   # Add your ImgBB API key (optional, for image features)
   # Edit src/environments/environment.ts
   ```

4. **Start development server**
   ```bash
   ng serve
   ```

5. **Open your browser**
   ```
   Navigate to http://localhost:4200
   ```

## 📖 Usage Guide

### 1. **File Import**
   - Click the upload area or drag & drop your CSV/Excel file
   - Supported formats: `.csv`, `.xlsx`, `.xls`
   - File validation provides immediate feedback

### 2. **Mode Selection**
   - Choose between **Provider Menu** or **3P Assortments** mode
   - Each mode has different capabilities and restrictions

### 3. **Column Management**
   - Review imported headers in the data table
   - Click column headers to select/deselect for processing
   - Use header mapping for Georgian → English translation

### 4. **Image Assignment** (Provider Menu mode)
   - Upload images using the image upload section
   - Click the camera icon (📷) on any row to assign images
   - Use auto-matching to intelligently match images to data

### 5. **Data Processing**
   - Select desired columns for processing
   - Click "Process Selected Columns" to transform data
   - Review processed data in the results table

### 6. **Export**
   - Click "Export CSV" to download processed data
   - Files are properly formatted and ready for use

## 🛠️ Technical Stack

- **Frontend Framework**: Angular 20+ with Standalone Components
- **Language**: TypeScript 5.8+
- **Styling**: Tailwind CSS 4.1+
- **State Management**: Angular Signals
- **File Processing**: ExcelJS for Excel support
- **HTTP Client**: Angular HttpClient
- **Image Hosting**: ImgBB API integration

## 🏗️ Project Structure

```
src/
├── app/
│   ├── app.ts              # Main component with signals
│   ├── app.html            # Template with modern Angular syntax
│   ├── app.css             # Component-specific styles
│   └── app.config.ts       # Application configuration
├── assets/                 # Static assets
├── environments/           # Environment configurations
└── styles.css             # Global styles
```

## 🔧 Development

### Building for Production

```bash
ng build --configuration production
```

### Running Tests

```bash
ng test
```

### Code Quality

```bash
# Linting
ng lint

# Formatting
npx prettier --write src/
```

## 🌟 Key Technologies Used

- **Angular Signals**: Reactive state management
- **Standalone Components**: Modern Angular architecture
- **Control Flow**: `@if`, `@for`, `@switch` syntax
- **Signal-based Forms**: Modern form handling
- **OnPush Change Detection**: Optimized performance

## 🔮 Future Enhancements

- [ ] **Batch Processing**: Handle multiple files simultaneously
- [ ] **Advanced Filtering**: Complex data filtering options
- [ ] **Export Formats**: Support for JSON, XML, and other formats
- [ ] **Data Validation**: Advanced validation rules and error handling
- [ ] **User Profiles**: Save user preferences and processing templates
- [ ] **API Integration**: Direct integration with WMS APIs
- [ ] **Real-time Collaboration**: Multi-user editing capabilities
- [ ] **Advanced Analytics**: Data insights and processing statistics

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please [open an issue](../../issues) in this repository.

---

<div align="center">
  <p>Built with ❤️ for efficient warehouse management</p>
  <p>© 2025 Toolkit for WMS. All rights reserved.</p>
</div>

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
