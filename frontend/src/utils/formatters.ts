export const formatNumber = (value?: number | null) => {
  if (value == null) return "-";
  return value.toLocaleString();
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export const formatTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleTimeString();
};

export const formatDateTime = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  
  if (options) {
      return date.toLocaleString('en-US', options);
  }
  return date.toLocaleString();
};
