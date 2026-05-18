/**
 * Format number to Indian Rupee format
 * e.g., 150000 -> ₹ 1,50,000
 */
export function formatINR(amount) {
  if (amount === null || amount === undefined) return '₹ 0';
  const num = Number(amount);
  if (isNaN(num)) return '₹ 0';
  
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR'
  });
  return formatted;
}

/**
 * Format date to DD/MM/YYYY
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format datetime to DD/MM/YYYY HH:MM
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get status badge class
 */
export function getStatusBadge(status) {
  const map = {
    'in_stock': 'badge-success',
    'allocated': 'badge-info',
    'damaged': 'badge-danger',
    'retired': 'badge-neutral',
    'low': 'badge-warning',
    'medium': 'badge-warning',
    'high': 'badge-danger',
    'critical': 'badge-danger',
  };
  return map[status] || 'badge-neutral';
}

/**
 * Format status label
 */
export function formatStatus(status) {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Calculate the current Written Down Value (depreciated book value) of an asset
 * applying Indian Income Tax rules (40% computers, 15% other electronics, 5% floor)
 */
export function calculateBookValue(price, purchaseDateStr, categoryName) {
  if (!price) return 0;
  if (!purchaseDateStr) return price;
  
  const purchaseDate = new Date(purchaseDateStr);
  const currentDate = new Date();
  if (isNaN(purchaseDate.getTime()) || purchaseDate > currentDate) return price;

  const cat = (categoryName || '').toLowerCase();
  let rate = 0.15; // default standard rate (15%) for equipment/monitors/phones
  if (cat.includes('laptop') || cat.includes('computer') || cat.includes('software')) {
    rate = 0.40; // 40% for laptops/computers
  } else if (cat.includes('furniture')) {
    rate = 0.10; // 10% for furniture
  }

  const msDiff = currentDate - purchaseDate;
  const yearsElapsed = msDiff / (1000 * 60 * 60 * 24 * 365.25);

  // WDV reducing balance formula
  const bookValue = price * Math.pow(1 - rate, yearsElapsed);

  // Corporate standard: Scrap value floor at 5% of purchase price
  const scrapFloor = price * 0.05;
  return Math.max(bookValue, scrapFloor);
}
 
/**
 * Calculate human-readable duration left or overdue from an expected return date
 */
export function formatTimeRemaining(expectedReturnDateStr) {
  if (!expectedReturnDateStr) return { text: 'No due date set', isOverdue: false, days: 0 };
  
  const expected = new Date(expectedReturnDateStr);
  const today = new Date();
  
  // Set times to midnight to calculate pure date differences
  expected.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  const diffTime = expected.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return { text: 'Due Today ⏰', isOverdue: false, days: 0 };
  } else if (diffDays > 0) {
    if (diffDays === 1) return { text: '1 day remaining', isOverdue: false, days: 1 };
    return { text: `${diffDays} days remaining`, isOverdue: false, days: diffDays };
  } else {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 1) return { text: 'Overdue by 1 day ⚠️', isOverdue: true, days: 1 };
    return { text: `Overdue by ${overdueDays} days 🚨`, isOverdue: true, days: overdueDays };
  }
}
