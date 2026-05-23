import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AccountMovement, CURRENCIES } from '@/types/database';
import { generatePDFHeaderHTML, generatePDFHeaderStyles } from './pdfHeaderGenerator';

interface MovementWithBalance extends AccountMovement {
  runningBalance: number;
}

function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.symbol || code;
}

function getCurrencyName(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.name || code;
}

export function generateAccountStatementHTML(
  customerName: string,
  movements: AccountMovement[],
  logoDataUrl?: string
): string {
  const allMovements = [...movements];

  const filteredMovements = allMovements
    .filter((m) => !(m as any).is_commission_movement)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Helper function to get combined amount including related commission
  const getCombinedAmount = (movement: AccountMovement): number => {
    const baseAmount = Number(movement.amount);
    const relatedCommissions = allMovements.filter(
      (m) =>
        (m as any).is_commission_movement === true &&
        (m as any).related_commission_movement_id === movement.id &&
        m.customer_id === movement.customer_id &&
        m.movement_type === movement.movement_type &&
        m.currency === movement.currency
    );
    const commissionTotal = relatedCommissions.reduce(
      (sum, m) => sum + Number(m.amount),
      0,
    );
    return baseAmount + commissionTotal;
  };

  // Group movements by currency
  const groupedByCurrency = filteredMovements.reduce((acc, movement) => {
    if (!acc[movement.currency]) {
      acc[movement.currency] = [];
    }
    acc[movement.currency].push(movement);

    return acc;
  }, {} as Record<string, AccountMovement[]>);

  const reportDate = format(new Date(), 'EEEE، dd MMMM yyyy', { locale: ar });

  // Rows per page-table: chosen conservatively so each table fits on one page
  // and the thead is always present at the top of every printed page.
  // First page of the first currency is shorter because the company header
  // (logo + title + phones) takes ~1/3 of the available height.
  const ROWS_PER_PAGE = 22;
  const ROWS_FIRST_PAGE = 12;

  const tableHead = `
    <thead>
      <tr>
        <th style="width: 12%;">التاريخ</th>
        <th style="width: 38%;">البيان</th>
        <th style="width: 15%;">له</th>
        <th style="width: 15%;">عليه</th>
        <th style="width: 20%;">الرصيد</th>
      </tr>
    </thead>
  `;

  // Generate sections for each currency
  const currencySections = Object.entries(groupedByCurrency).map(([curr, currMovements], sectionIndex) => {
    const movementsWithBalance: MovementWithBalance[] = [];
    let runningBalance = 0;

    currMovements.forEach((movement) => {
      const combinedAmount = getCombinedAmount(movement);

      if (movement.movement_type === 'incoming') {
        runningBalance += combinedAmount;
      } else {
        runningBalance -= combinedAmount;
      }

      movementsWithBalance.push({
        ...movement,
        runningBalance,
      });
    });

    const totalOutgoing = currMovements
      .filter(m => m.movement_type === 'outgoing')
      .reduce((sum, m) => sum + getCombinedAmount(m), 0);

    const totalIncoming = currMovements
      .filter(m => m.movement_type === 'incoming')
      .reduce((sum, m) => sum + getCombinedAmount(m), 0);

    const finalBalance = totalIncoming - totalOutgoing;
    const currencyName = getCurrencyName(curr);

    const movementRowHtmls = movementsWithBalance.map((movement) => {
      const balanceDisplay = movement.runningBalance > 0
        ? `${Math.round(movement.runningBalance).toLocaleString('en-US')} ${currencyName} (له)`
        : movement.runningBalance < 0
        ? `${Math.round(Math.abs(movement.runningBalance)).toLocaleString('en-US')} ${currencyName} (عليه)`
        : '-';

      const dateStr = format(new Date(movement.created_at), 'dd/MM/yyyy');
      const combinedAmount = getCombinedAmount(movement);
      const incomingAmount = movement.movement_type === 'incoming'
        ? Math.round(combinedAmount).toLocaleString('en-US')
        : '-';
      const outgoingAmount = movement.movement_type === 'outgoing'
        ? Math.round(combinedAmount).toLocaleString('en-US')
        : '-';

      return `
        <tr>
          <td class="cell text-center">${dateStr}</td>
          <td class="cell" style="text-align: right; padding-right: 12px;">${movement.notes || movement.movement_number}</td>
          <td class="cell text-center">${incomingAmount}</td>
          <td class="cell text-center">${outgoingAmount}</td>
          <td class="cell text-center">${balanceDisplay}</td>
        </tr>
      `;
    });

    const finalBalanceDisplay = finalBalance > 0
      ? `${Math.round(finalBalance).toLocaleString('en-US')} ${currencyName} (له)`
      : finalBalance < 0
      ? `${Math.round(Math.abs(finalBalance)).toLocaleString('en-US')} ${currencyName} (عليه)`
      : '-';

    const totalIncomingStr = totalIncoming > 0 ? Math.round(totalIncoming).toLocaleString('en-US') : '-';
    const totalOutgoingStr = totalOutgoing > 0 ? Math.round(totalOutgoing).toLocaleString('en-US') : '-';

    const summaryRows = `
      <tr class="total-row">
        <td colspan="2" class="cell text-center">المجموع</td>
        <td class="cell text-center">${totalIncomingStr}</td>
        <td class="cell text-center">${totalOutgoingStr}</td>
        <td class="cell text-center">-</td>
      </tr>
      <tr class="final-row">
        <td colspan="4" class="cell text-center"><strong>الرصيد النهائي</strong></td>
        <td class="cell text-center"><strong>${finalBalanceDisplay}</strong></td>
      </tr>
    `;

    // Chunk rows into pages so each rendered table fits on a single PDF page
    // with its own <thead>. This guarantees the header appears on every page
    // (instead of relying on display: table-header-group, which is unreliable
    // in expo-print on iOS).
    const chunks: string[][] = [];
    if (movementRowHtmls.length === 0) {
      chunks.push([]);
    } else {
      const firstChunkSize = sectionIndex === 0 ? ROWS_FIRST_PAGE : ROWS_PER_PAGE;
      chunks.push(movementRowHtmls.slice(0, firstChunkSize));
      let offset = firstChunkSize;
      while (offset < movementRowHtmls.length) {
        chunks.push(movementRowHtmls.slice(offset, offset + ROWS_PER_PAGE));
        offset += ROWS_PER_PAGE;
      }
    }

    const totalPages = chunks.length;

    const pagesHtml = chunks.map((rows, pageIndex) => {
      const isLastPage = pageIndex === totalPages - 1;
      const isFirstPage = pageIndex === 0;
      const pageBreakClass = (sectionIndex > 0 && isFirstPage) || !isFirstPage
        ? 'page-break-before'
        : '';

      const pageLabel = totalPages > 1
        ? `<span class="page-indicator">صفحة ${pageIndex + 1} من ${totalPages}</span>`
        : '';

      return `
        <div class="currency-page ${pageBreakClass}">
          <div class="section-title">
            <h2>كشف حساب ${customerName} - ${currencyName}</h2>
            ${pageLabel}
          </div>
          <table>
            ${tableHead}
            <tbody>
              ${rows.join('')}
              ${isLastPage ? summaryRows : ''}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return pagesHtml;
  }).join('');

  const headerHTML = generatePDFHeaderHTML({
    title: `كشف حساب العميل: ${customerName}`,
    logoDataUrl,
    primaryColor: '#382de3',
    darkColor: '#2821b8',
    height: 150,
    showPhones: true,
  });

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كشف الحساب - ${customerName}</title>
  <style>
    @page {
      margin: 1.5cm 1cm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      background: #fff;
      color: #000;
      direction: rtl;
      padding: 15px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-wrapper {
      margin-bottom: 25px;
      page-break-inside: avoid;
      page-break-after: avoid;
    }

    .currency-page {
      margin-bottom: 20px;
    }

    .page-break-before {
      page-break-before: always;
    }

    .section-title {
      border: 2px solid #000;
      padding: 12px 20px;
      margin-bottom: 0;
      text-align: center;
      background: #f9fafb;
      page-break-after: avoid;
      page-break-inside: avoid;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-title h2 {
      font-size: 20px;
      font-weight: bold;
      margin: 0;
      color: #111827;
      flex: 1;
      text-align: center;
    }

    .page-indicator {
      font-size: 12px;
      color: #6b7280;
      font-weight: normal;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      border-top: none;
      background: #fff;
    }

    tr {
      page-break-inside: avoid;
    }

    th {
      background-color: #e5e7eb;
      font-weight: bold;
      padding: 10px 8px;
      border: 1px solid #000;
      font-size: 14px;
      text-align: center;
      color: #111827;
    }

    td {
      padding: 8px 6px;
      border: 1px solid #000;
      text-align: center;
      font-size: 13px;
      color: #374151;
      vertical-align: middle;
    }

    .text-center {
      text-align: center !important;
    }

    .cell {
      min-height: 30px;
    }

    .total-row {
      background-color: #f3f4f6;
      font-weight: bold;
      font-size: 14px;
    }

    .final-row {
      background-color: #dbeafe;
      font-weight: bold;
      font-size: 15px;
      color: #1e40af;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      padding: 10px 0;
      border-top: 1px solid #e5e7eb;
    }

    ${generatePDFHeaderStyles()}

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        margin: 1.5cm 1cm;
      }

      .header-wrapper {
        page-break-inside: avoid;
        page-break-after: avoid;
      }

      .section-title {
        page-break-after: avoid;
        page-break-inside: avoid;
      }

      .page-break-before {
        page-break-before: always !important;
      }

      tr {
        page-break-inside: avoid !important;
      }

      th {
        background-color: #e5e7eb !important;
        -webkit-print-color-adjust: exact !important;
      }

      .total-row {
        background-color: #f3f4f6 !important;
        -webkit-print-color-adjust: exact !important;
      }

      .final-row {
        background-color: #dbeafe !important;
        -webkit-print-color-adjust: exact !important;
      }

      .section-title {
        background: #f9fafb !important;
        -webkit-print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-wrapper">
    ${headerHTML}
  </div>

  ${currencySections}

  <div class="footer">
    <div>تاريخ الطباعة: ${reportDate}</div>
  </div>
</body>
</html>
  `;
}

export function generateAccountStatementForAllCurrencies(
  customerName: string,
  movements: AccountMovement[],
  logoDataUrl?: string
): string {
  return generateAccountStatementHTML(customerName, movements, logoDataUrl);
}
