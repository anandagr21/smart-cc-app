export function formatCurrencyIN(value: number): string {
  if (value < 1000) {
    return `₹${value.toLocaleString('en-IN')}`;
  }
  
  if (value < 100000) {
    // Convert to k
    let kValue = (value / 1000).toFixed(1);
    // Remove trailing .0 if present
    if (kValue.endsWith('.0')) {
      kValue = kValue.slice(0, -2);
    }
    return `₹${kValue}k`;
  }
  
  // Convert to L (Lakhs)
  let lValue = (value / 100000).toFixed(2);
  // Remove trailing zeros
  if (lValue.endsWith('.00')) {
    lValue = lValue.slice(0, -3);
  } else if (lValue.endsWith('0')) {
    lValue = lValue.slice(0, -1);
  }
  
  return `₹${lValue}L`;
}
