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
  const sortedMovements = [...movements].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Group movements by currency
  const groupedByCurrency = sortedMovements.reduce((acc, movement) => {
    if (!acc[movement.currency]) {
      acc[movement.currency] = [];
    }
    acc[movement.currency].push(movement);

    return acc;
  }, {} as Record<string, AccountMovement[]>);

  const reportDate = format(new Date(), 'dd-MM-yyyy');

  // Generate sections for each currency
  const currencySections = Object.entries(groupedByCurrency).map(([curr, currMovements]) => {
    const movementsWithBalance: MovementWithBalance[] = [];
    let runningBalance = 0;

    currMovements.forEach((movement) => {
      const amount = Number(movement.amount);
      const commission = movement.commission && Number(movement.commission) > 0
        && movement.commission_currency === movement.currency
        ? Number(movement.commission)
        : 0;

      // incoming = تسليم للعميل (يضيف للرصيد)
      // outgoing = استلام من العميل (يخصم من الرصيد + عمولة إذا كانت بنفس العملة)
      if (movement.movement_type === 'incoming') {
        runningBalance += amount;
      } else {
        runningBalance -= (amount + commission);
      }

      movementsWithBalance.push({
        ...movement,
        runningBalance,
      });
    });

    const totalOutgoing = currMovements
      .filter(m => m.movement_type === 'outgoing')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalIncoming = currMovements
      .filter(m => m.movement_type === 'incoming')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // الرصيد = التسليم - الاستلام
    // رصيد موجب = "لنا عنده"، رصيد سالب = "له عندنا"
    const finalBalance = totalIncoming - totalOutgoing;
    const currencyName = getCurrencyName(curr);

    const movementRows = movementsWithBalance
      .map((movement) => {
        // رصيد موجب = "لنا عنده" (يعرض عليه)
        // رصيد سالب = "له عندنا" (يعرض له)
        const balanceDisplay = movement.runningBalance > 0
          ? `${Math.round(movement.runningBalance).toLocaleString('en-US')}- ${currencyName}`
          : movement.runningBalance < 0
          ? `${Math.round(Math.abs(movement.runningBalance)).toLocaleString('en-US')} ${currencyName}`
          : '0';

        return `
        <tr>
          <td class="cell">${format(new Date(movement.created_at), 'dd-MM-yyyy')}</td>
          <td class="cell">${movement.notes || movement.movement_number}</td>
          <td class="cell text-center">${movement.movement_type === 'incoming' ? Math.round(Number(movement.amount)).toLocaleString('en-US') : ''}</td>
          <td class="cell text-center">${movement.movement_type === 'outgoing' ? Math.round(Number(movement.amount)).toLocaleString('en-US') : ''}</td>
          <td class="cell text-center">${balanceDisplay}</td>
        </tr>
        `;
      })
      .join('');

    const finalBalanceDisplay = finalBalance > 0
      ? `${Math.round(finalBalance).toLocaleString('en-US')}- ${currencyName}`
      : finalBalance < 0
      ? `${Math.round(Math.abs(finalBalance)).toLocaleString('en-US')} ${currencyName}`
      : '0';

    return `
    <div class="currency-section">
      <div class="section-title">
        <h2>كشف الحساب#${customerName} ${currencyName}</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>التفاصيل</th>
            <th>له</th>
            <th>عليه</th>
            <th>الرصيد</th>
          </tr>
        </thead>
        <tbody>
          ${movementRows}
          <tr class="total-row">
            <td colspan="2" class="cell text-center">إجمالي العمليات</td>
            <td class="cell text-center">${Math.round(totalIncoming).toLocaleString('en-US')}</td>
            <td class="cell text-center">${Math.round(totalOutgoing).toLocaleString('en-US')}</td>
            <td class="cell text-center"></td>
          </tr>
          <tr class="final-row">
            <td colspan="4" class="cell text-center">الإجمالي- له</td>
            <td class="cell text-center">${finalBalanceDisplay}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
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
  <title>كشف الحساب</title>
  <style>
    @page {
      margin-top: 50mm;
      margin-bottom: 50mm;
      margin-left: 15mm;
      margin-right: 15mm;
    }

    @page :first {
      margin-top: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif;
      background: #fff;
      color: #000;
      direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-wrapper {
      margin-bottom: 20px;
    }

    .currency-section {
      margin-bottom: 30px;
      page-break-after: always;
    }

    .currency-section:last-child {
      page-break-after: auto;
    }

    .section-title {
      border: 3px solid #000;
      padding: 15px;
      margin-bottom: 0;
      text-align: center;
      background: #fff;
    }

    .section-title h2 {
      font-size: 18px;
      font-weight: bold;
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 3px solid #000;
      border-top: none;
    }

    th {
      background-color: #fff;
      font-weight: bold;
      padding: 12px 8px;
      border: 2px solid #000;
      font-size: 14px;
      text-align: center;
    }

    td {
      padding: 10px 8px;
      border: 2px solid #000;
      text-align: right;
      font-size: 13px;
    }

    .text-center {
      text-align: center !important;
    }

    .cell {
      min-height: 35px;
    }

    .total-row {
      background-color: #fff;
      font-weight: bold;
    }

    .final-row {
      background-color: #fff;
      font-weight: bold;
      font-size: 14px;
    }

    .footer {
      margin-top: 30px;
      text-align: left;
      font-size: 12px;
      color: #000;
      padding: 10px 0;
    }

    ${generatePDFHeaderStyles()}

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      html {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      @page {
        margin-top: 50mm;
        margin-bottom: 50mm;
        margin-left: 15mm;
        margin-right: 15mm;
      }

      @page :first {
        margin-top: 15mm;
      }

      .currency-section {
        page-break-after: always;
      }

      .currency-section:last-child {
        page-break-after: auto;
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
    ${reportDate} | 1 / 1
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
