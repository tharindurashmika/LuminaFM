/**
 * LuminaFM Enterprise Data Export Utilities
 * Provides CSV and JSON file download capabilities for facility tables and reports.
 */

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => string | number | boolean | null | undefined);
}

/**
 * Exports an array of items to a downloadable CSV file.
 * Automatically adds UTF-8 Byte Order Mark (BOM) for Excel compatibility.
 */
export function exportToCsv<T>(
  data: T[],
  columns: ExportColumn<T>[],
  fileNamePrefix: string = 'lumina_export'
): void {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  const escapeCsvValue = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const stringVal = String(val);
    if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return `"${stringVal}"`;
  };

  const headers = columns.map((col) => escapeCsvValue(col.header)).join(',');
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let rawVal: unknown;
        if (typeof col.accessor === 'function') {
          rawVal = col.accessor(item);
        } else {
          rawVal = item[col.accessor];
        }
        return escapeCsvValue(rawVal);
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  link.setAttribute('href', url);
  link.setAttribute('download', `${fileNamePrefix}_${timestamp}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports arbitrary data as a formatted JSON file.
 */
export function exportToJson<T>(
  data: T,
  fileNamePrefix: string = 'lumina_export'
): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  link.setAttribute('href', url);
  link.setAttribute('download', `${fileNamePrefix}_${timestamp}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
