/**
 * @fileOverview Centralized configuration module for reusable predefined option constants.
 * Workflow fields of type 'option' reference these predefined arrays by key.
 */

export const validDepartments = [
  "Khoa Giáo dục Quốc phòng & An ninh",
  "Khoa Giáo dục Thể chất",
  "Khoa Lý luận Chính trị",
  "Trường Cơ khí",
  "Trường Công nghệ Thông tin và Truyền thông",
  "Trường Điện - Điện tử",
  "Trường Hoá và Khoa học sự sống",
  "Trường Vật liệu",
  "Trường Kinh tế",
  "Khoa Toán - Tin",
  "Khoa Vật lý Kỹ thuật",
  "Khoa Ngoại ngữ",
  "Khoa Khoa học và Công nghệ Giáo dục",
] as const;

export const equipmentList = [
  "Máy chiếu Sony Full HD",
  "Bộ Micro không dây (2 tay mic)",
  "Loa kéo di động công suất 300W",
  "Laptop trình chiếu Dell Core i5",
  "Bộ cáp chuyển đổi đa năng HDMI/VGA/Type-C",
  "Bảng flipchart kèm bút viết",
] as const;

export const supportTypes = [
  "Hỗ trợ Âm thanh & Ánh sáng sân khấu",
  "Hỗ trợ Livestream & Kỹ thuật mạng",
  "Hỗ trợ Hậu cần & Bàn ghế khán phòng",
  "Hỗ trợ Chụp ảnh & Truyền thông đưa tin",
] as const;

export const PREDEFINED_OPTIONS: Record<string, readonly string[]> = {
  validDepartments,
  equipmentList,
  supportTypes,
};

export const PREDEFINED_OPTION_DESCRIPTIONS: Record<string, string> = {
  validDepartments: "Danh sách Khoa / Viện / Trường (HUST)",
  equipmentList: "Danh mục thiết bị mượn giảng dạy & sự kiện",
  supportTypes: "Danh mục hạng mục hỗ trợ sự kiện",
};

/**
 * Retrieves predefined option values for a given constant key.
 */
export function getPredefinedOptions(key?: string): string[] | undefined {
  if (!key || !(key in PREDEFINED_OPTIONS)) return undefined;
  return [...PREDEFINED_OPTIONS[key]];
}

/**
 * Checks whether a given key is a registered predefined option constant.
 */
export function isValidPredefinedOptionKey(key?: string): boolean {
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(PREDEFINED_OPTIONS, key);
}

/**
 * Returns metadata for all available predefined option keys.
 */
export function getAllPredefinedOptionKeys(): {
  key: string;
  label: string;
  count: number;
}[] {
  return Object.keys(PREDEFINED_OPTIONS).map((key) => ({
    key,
    label: PREDEFINED_OPTION_DESCRIPTIONS[key] || key,
    count: PREDEFINED_OPTIONS[key].length,
  }));
}
