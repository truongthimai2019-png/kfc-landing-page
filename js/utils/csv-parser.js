/**
 * csv-parser.js – Đọc và phân tích file CSV thành mảng object
 */

/**
 * Phân tích chuỗi CSV (có hỗ trợ ngoặc kép, dấu phẩy trong ô, BOM, CRLF)
 * @param {string} text – Nội dung CSV dạng văn bản
 * @returns {Array<Object>} – Mảng các object tương ứng mỗi dòng
 */
export function parseCSV(text) {
  // Bỏ BOM nếu có
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = splitCSVLines(clean);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const obj = {};
    headers.forEach((h, idx) => {
      const raw = values[idx] ?? '';
      obj[h.trim()] = coerceValue(raw);
    });
    result.push(obj);
  }
  return result;
}

/**
 * Tách CSV thành mảng dòng (cẩn thận với xuống dòng bên trong ngoặc kép)
 */
function splitCSVLines(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Giữ lại dấu ngoặc kép trong dòng để parseCSVRow tự xử lý tiếp,
      // nếu không giữ thì dấu phẩy trong ô (đã mất dấu ngoặc bọc) sẽ bị hiểu nhầm là dấu phân cách cột
      current += '"';
      if (inQuotes && text[i + 1] === '"') {
        // Escape ngoặc kép bên trong: "" → "
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Tách một dòng CSV thành mảng giá trị (xử lý dấu phẩy trong ngoặc kép)
 */
function parseCSVRow(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

/**
 * Tự ép kiểu: số nguyên, 0/1 boolean, chuỗi
 */
function coerceValue(raw) {
  if (raw === '') return '';
  if (raw === '0' || raw === '1') {
    // Giữ nguyên dạng số để dùng so sánh == 1
    return Number(raw);
  }
  const num = Number(raw);
  if (!isNaN(num) && raw !== '') return num;
  return raw;
}

/**
 * Tải file CSV từ path và trả về mảng object
 * @param {string} path – Đường dẫn tới file CSV
 * @returns {Promise<Array<Object>>}
 */
export async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Không tải được ${path}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}
