type DateFormats = "long_date" | "short_date" | "medium_date";

export const formatDate = (
  date: Date | string,
  dateFormat: DateFormats,
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  // Relative time
  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  // Static formats
  const dateFormatOptions: Record<DateFormats, Intl.DateTimeFormatOptions> = {
    long_date: { dateStyle: "full" },
    medium_date: { dateStyle: "medium" },
    short_date: { dateStyle: "short" },
  };

  return new Intl.DateTimeFormat("en-US", dateFormatOptions[dateFormat]).format(
    dateObj,
  );
};
/**
 * Validates and formats a string to Kenyan standard +254...
 * @param phone The raw input string
 * @returns { isValid: boolean, formatted: string }
 */
export const processKenyanPhone = (phone: string) => {
  // 1. Remove all non-numeric characters (except +)
  let cleaned = phone.replace(/[^\d+]/g, "");

  // 2. Normalize to +254 format
  let formatted = cleaned;
  if (cleaned.startsWith("0")) {
    formatted = "+254" + cleaned.substring(1);
  } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
    formatted = "+254" + cleaned;
  } else if (cleaned.startsWith("254")) {
    formatted = "+" + cleaned;
  }

  // 3. Validate against Kenyan Regex
  // Matches +254 followed by 7 or 1, then 8 digits
  const kenyanRegex = /^\+254(7|1)\d{8}$/;
  const isValid = kenyanRegex.test(formatted);

  return {
    isValid,
    formatted: isValid ? formatted : cleaned, // return formatted if valid, else original cleaned
  };
};
/**
 * Formats a number to fit within a specific character limit
 * @param amount The number to format
 * @param maxChars Total characters allowed (default 8)
 */
export const formatAmountLimit = (
  amount: number,
  maxChars: number = 8,
): string => {
  if (amount === 0) return "0.00";

  // 1. Try standard formatting first (e.g., 1,234.56)
  const standard = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (standard.length <= maxChars) {
    return standard;
  }

  // 2. If it exceeds maxChars, use Suffixes (K for Thousand, M for Million)
  // We subtract room for the suffix and decimal (usually 4 chars total for ".00M")
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions.toFixed(2) + "M";
    return formatted.length <= maxChars ? formatted : millions.toFixed(0) + "M";
  }

  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    const formatted = thousands.toFixed(2) + "K";
    return formatted.length <= maxChars
      ? formatted
      : thousands.toFixed(0) + "K";
  }

  return standard.substring(0, maxChars);
};
