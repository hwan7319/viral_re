/** Client-side representation used for the comma-separated API filter values. */
export const selectedFilterValues = (value: string) => value === 'all' ? [] : value.split(',').filter(Boolean);

export const hasFilterValue = (value: string, option: string) => selectedFilterValues(value).includes(option);

export const toggleFilterValue = (value: string, option: string) => {
  const current = selectedFilterValues(value);
  return current.includes(option) ? (current.filter(item => item !== option).join(',') || 'all') : [...current, option].join(',');
};

/** Select a value if absent, preserving it when a UI control confirms it. */
export const ensureFilterValue = (value: string, option: string) =>
  option === 'all' || hasFilterValue(value, option) ? value : toggleFilterValue(value, option);
