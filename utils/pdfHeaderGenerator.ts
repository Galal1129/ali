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
    primaryColor = '#3B82F6',
    darkColor = '#2563EB',
    height = 150,
    showPhones = true,
  } = options;

  return `
    <div class="pdf-header" style="
      position: relative;
      width: 100%;
      height: ${height}px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${darkColor} 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 40px;
      margin-bottom: 20px;
      border-radius: 0;
    ">
      ${showPhones ? `
      <div class="header-right" style="
        display: flex;
        align-items: center;
        justify-content: flex-end;
      ">
        <div class="contact-box" style="
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(12px);
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 20px;
          padding: 15px 25px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          min-width: 240px;
        ">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; text-align: center; white-space: nowrap;">
            Yemen - Sana'a
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-align: center; direction: ltr; letter-spacing: 0.8px;">
            ${COMPANY_INFO.phone1}
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-align: center; direction: ltr; letter-spacing: 0.8px;">
            ${COMPANY_INFO.phone2}
          </div>
        </div>
      </div>
      ` : ''}

      <div class="header-center" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
      ">
        ${logoDataUrl
          ? `<img src="${logoDataUrl}" alt="Logo" style="height: 60px; width: auto; object-fit: contain; filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.4));" />`
          : `<div style="font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.4; text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.4); text-align: center;">الترف</div>
             <div style="font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.4; text-shadow: 2px 2px 6px rgba(0, 0, 0, 0.4); text-align: center;">للتحويلات المالية</div>`
        }
        <div style="
          background: #ffffff;
          color: ${primaryColor};
          padding: 4px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        ">
          Al-Taraf
        </div>
      </div>

      ${showPhones ? `
      <div class="header-left" style="
        display: flex;
        align-items: center;
        justify-content: flex-start;
      ">
        <div class="contact-box" style="
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(12px);
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-radius: 20px;
          padding: 15px 25px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          min-width: 240px;
        ">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; text-align: center; white-space: nowrap;">
            اليمن - صنعاء
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-align: center; direction: ltr; letter-spacing: 0.8px;">
            ${COMPANY_INFO.phone1}
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #ffffff; text-align: center; direction: ltr; letter-spacing: 0.8px;">
            ${COMPANY_INFO.phone2}
          </div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="document-title" style="
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      margin: 20px 0;
      padding: 10px;
    ">
      ${title}
    </div>
  `;
}

export function generatePDFHeaderStyles(): string {
  return `
    @media print {
      .pdf-header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        color-adjust: exact;
      }
    }
  `;
}
