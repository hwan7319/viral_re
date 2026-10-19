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

/**
 * A province and one of its districts are overlapping filters. Selecting a
 * district must remove only that province-wide option while preserving other
 * districts and selections from other provinces.
 */
export const toggleScopedLocation = (value: string, sido: string, sigungu?: string) => {
  const values = selectedFilterValues(value);
  const target = sigungu ? `${sido} ${sigungu}` : sido;

  if (!sigungu) {
    const withoutScope = values.filter(item => item !== sido && !item.startsWith(`${sido} `));
    return values.includes(sido) ? (withoutScope.join(',') || 'all') : [...withoutScope, sido].join(',');
  }

  const withoutProvinceWide = values.filter(item => item !== sido);
  return values.includes(target)
    ? (withoutProvinceWide.filter(item => item !== target).join(',') || 'all')
    : [...withoutProvinceWide, target].join(',');
};

/** Select a whole province without clearing selections in other provinces. */
export const selectProvinceLocation = (value: string, sido: string) => {
  const withoutScope = selectedFilterValues(value).filter(item => item !== sido && !item.startsWith(`${sido} `));
  return [...withoutScope, sido].join(',');
};
