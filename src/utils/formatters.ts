export const CURRENCY_SYMBOL = '₦';

export const formatCurrency = (amount: number | string | undefined | null, showDecimals: boolean = false): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return `${CURRENCY_SYMBOL}0`;
  }
  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (showDecimals) {
    return `${CURRENCY_SYMBOL}${numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${CURRENCY_SYMBOL}${numericValue.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}`;
};
