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

  return `
    <div class="pdf-header" style="background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);">
      ${showPhones ? `
      <div class="header-right">
        <div class="contact-box">
          <div class="contact-box-title">Yemen - Sana'a</div>
          <div class="contact-box-phone">${COMPANY_INFO.phone1}</div>
          <div class="contact-box-phone">${COMPANY_INFO.phone2}</div>
        </div>
      </div>
      ` : '<div class="header-spacer"></div>'}

      <div class="header-center">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" alt="Logo" class="company-logo" />`
          : `<div class="company-name-ar">الترف</div>
             <div class="company-name-ar">للتحويلات المالية</div>`
        }
        <div class="company-name-en" style="background: #ffffff; color: ${primaryColor};">Al-Taraf</div>
      </div>

      ${showPhones ? `
      <div class="header-left">
        <div class="contact-box">
          <div class="contact-box-title">اليمن - صنعاء</div>
          <div class="contact-box-phone">${COMPANY_INFO.phone1}</div>
          <div class="contact-box-phone">${COMPANY_INFO.phone2}</div>
        </div>
      </div>
      ` : '<div class="header-spacer"></div>'}
    </div>

    <div class="document-title">${title}</div>
  `;
}

export function generatePDFHeaderStyles(): string {
  return `
    .pdf-header {
      position: relative;
      width: 100%;
      height: 150px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 60px;
      margin-bottom: 20px;
      overflow: visible;
      flex-shrink: 0;
    }

    .header-left,
    .header-right {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      width: 220px;
      flex-shrink: 0;
    }

    .header-left {
      justify-content: flex-start;
    }

    .header-right {
      justify-content: flex-end;
    }

    .header-center {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }

    .header-spacer {
      width: 220px;
      flex-shrink: 0;
    }

    .contact-box {
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-radius: 20px;
      padding: 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 200px;
    }

    .contact-box-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      line-height: 1.5;
      white-space: nowrap;
    }

    .contact-box-phone {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
      direction: ltr;
      letter-spacing: 0.8px;
      white-space: nowrap;
    }

    .company-logo {
      height: 50px;
      width: auto;
      object-fit: contain;
      filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.4));
    }

    .company-name-ar {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.4;
      text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.4);
      text-align: center;
      white-space: nowrap;
    }

    .company-name-en {
      padding: 4px 16px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      white-space: nowrap;
      line-height: 1.4;
    }

    .document-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin: 20px 0;
      padding: 10px;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .pdf-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
        page-break-inside: avoid;
        page-break-after: avoid;
      }

      .contact-box {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .company-name-en {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;
}
