// Export utilities for CSV/PDF generation
import { format } from 'date-fns';

interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void => {
  const headers = columns.map(col => col.header).join(',');
  
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      const formattedValue = col.formatter ? col.formatter(value) : value;
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(formattedValue ?? '').replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
    }).join(',')
  );
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async <T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  title: string,
  filename: string
): Promise<void> => {
  // Create a printable HTML document
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Generated on ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${columns.map(col => {
                const value = item[col.key];
                const formattedValue = col.formatter ? col.formatter(value) : value;
                return `<td>${formattedValue ?? ''}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p>Total records: ${data.length}</p>
        <p>CUTZ Platform - Barber Management System</p>
      </div>
    </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Specific export configurations
export const bookingExportColumns: ExportColumn[] = [
  { key: 'booking_date', header: 'Date', formatter: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '' },
  { key: 'start_time', header: 'Time', formatter: (v) => v?.slice(0, 5) || '' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'service_name', header: 'Service' },
  { key: 'total_amount', header: 'Amount', formatter: (v) => `CHF ${Number(v).toFixed(2)}` },
  { key: 'status', header: 'Status' },
];

export const earningsExportColumns: ExportColumn[] = [
  { key: 'date', header: 'Date', formatter: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '' },
  { key: 'description', header: 'Description' },
  { key: 'service_amount', header: 'Service Amount', formatter: (v) => `CHF ${Number(v).toFixed(2)}` },
  { key: 'platform_fee', header: 'Platform Fee', formatter: (v) => `CHF ${Number(v).toFixed(2)}` },
  { key: 'net_amount', header: 'Net Amount', formatter: (v) => `CHF ${Number(v).toFixed(2)}` },
];

export const clientExportColumns: ExportColumn[] = [
  { key: 'full_name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'total_bookings', header: 'Total Bookings' },
  { key: 'total_spent', header: 'Total Spent', formatter: (v) => `CHF ${Number(v).toFixed(2)}` },
  { key: 'last_visit', header: 'Last Visit', formatter: (v) => v ? format(new Date(v), 'MMM d, yyyy') : 'Never' },
];
