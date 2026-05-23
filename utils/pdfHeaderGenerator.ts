import { COMPANY_INFO } from '@/constants/companyInfo';

export interface PDFHeaderOptions {
  title: string;
  logoDataUrl?: string;
  primaryColor?: string;
  darkColor?: string;
  height?: number;
  showPhones?: boolean;
}

export function generatePDFHeaderHTML(options: PDFHeaderOptions): string {
  const {
    title,
    logoDataUrl,
    primaryColor = '#382de3',
    darkColor = '#2821b8',
    height = 150,
    showPhones = true,
  } = options;

  const logoHTML = logoDataUrl && logoDataUrl !== '' && !logoDataUrl.includes('undefined')
    ? `<img src="${logoDataUrl}" alt="Logo" class="company-logo" onerror="this.style.display='none'" />`
    : `<div class="company-name-ar">أبو أحمد</div>`;

  return `
    <div class="pdf-header">
      <div class="header-center">
        ${logoHTML}
        <div class="company-name-en">Abu Ahmed</div>
      </div>
    </div>

    <div class="document-title">${title}</div>
  `;
}

export function generatePDFHeaderStyles(): string {
  return `
    .pdf-header {
      position: relative;
      width: 100%;
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 30px;
      margin-bottom: 20px;
      overflow: visible;
      flex-shrink: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #FFFFFF;
      border: 1px solid rgba(220, 38, 38, 0.25);
      border-radius: 8px;
    }

    .pdf-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 10%;
      height: 100%;
      background: linear-gradient(to left, rgba(220, 38, 38, 0.15), transparent);
      pointer-events: none;
      border-radius: 0 8px 8px 0;
    }

    .pdf-header::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 10%;
      height: 100%;
      background: linear-gradient(to right, rgba(220, 38, 38, 0.15), transparent);
      pointer-events: none;
      border-radius: 8px 0 0 8px;
    }

    .header-center {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .company-logo {
      height: 60px;
      width: auto;
      max-width: 180px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1));
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .company-name-ar {
      font-size: 26px;
      font-weight: 800;
      color: #dc2626;
      line-height: 1.3;
      text-align: center;
      white-space: nowrap;
    }

    .company-name-en {
      padding: 6px 20px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      color: #dc2626;
      background: rgba(220, 38, 38, 0.05);
      white-space: nowrap;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .document-title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      color: #111827;
      margin: 18px 0 25px;
      padding: 8px;
    }

    .header-wrapper {
      position: relative;
      display: block;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .pdf-header {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        page-break-inside: avoid;
        page-break-after: avoid;
        box-sizing: border-box;
      }

      .header-wrapper {
        page-break-inside: avoid;
        page-break-after: avoid;
      }

      .contact-box {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box;
      }

      .company-name-en {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .company-logo {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
}
