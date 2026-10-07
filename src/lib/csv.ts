export function escapeCsvCell(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(header: string[], rows: (string | null | undefined)[][]): string {
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

export const LEAD_EXPORT_HEADER = [
  "Company",
  "Domain",
  "Open Role",
  "Location",
  "Tech Stack",
  "Salary Range",
  "Hiring Velocity Score",
  "Decision Maker",
  "DM Role",
  "Verified Email",
  "Email Status",
  "Confidence",
  "LinkedIn",
  "Job URL",
  "Posted At",
];
