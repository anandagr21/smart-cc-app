import { TransactionResponse, TransactionGroup } from '../types/transaction.types';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

export function groupTransactionsByDate(transactions: TransactionResponse[]): TransactionGroup[] {
  const groups: Record<string, TransactionResponse[]> = {};

  transactions.forEach((tx) => {
    // transaction_date is YYYY-MM-DD
    const date = parseISO(tx.transaction_date);
    let groupTitle = '';

    if (isToday(date)) {
      groupTitle = 'Today';
    } else if (isYesterday(date)) {
      groupTitle = 'Yesterday';
    } else if (isThisWeek(date)) {
      groupTitle = 'Earlier This Week';
    } else {
      groupTitle = format(date, 'MMMM yyyy'); // e.g. "May 2026"
    }

    if (!groups[groupTitle]) {
      groups[groupTitle] = [];
    }
    groups[groupTitle].push(tx);
  });

  // Sort groups (Today, Yesterday, Earlier This Week, then months)
  // Since the backend returns them sorted by date DESC, we can mostly rely on the order they appear,
  // but to be safe, we extract and sort based on the first item's date
  return Object.keys(groups)
    .map((title) => ({
      title,
      data: groups[title],
      firstDate: groups[title][0].transaction_date,
    }))
    .sort((a, b) => (a.firstDate < b.firstDate ? 1 : -1))
    .map(({ title, data }) => ({ title, data }));
}
