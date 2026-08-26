import { UserCardResponse } from '../types/api';

const BANK_RULES: Array<{ match: RegExp; name: string }> = [
  { match: /\b(axis)\b/i, name: 'Axis Bank' },
  { match: /\b(hdfc)\b/i, name: 'HDFC Bank' },
  { match: /\b(icici)\b/i, name: 'ICICI Bank' },
  { match: /\b(sbi|state bank|air india sbi)\b/i, name: 'SBI Card' },
  { match: /\b(yes bank|yes)\b/i, name: 'Yes Bank' },
  { match: /\b(kotak)\b/i, name: 'Kotak Mahindra Bank' },
  { match: /\b(rbl)\b/i, name: 'RBL Bank' },
  { match: /\b(idfc)\b/i, name: 'IDFC FIRST Bank' },
  { match: /\b(amex|american express)\b/i, name: 'American Express' },
  { match: /\b(bob|bank of baroda)\b/i, name: 'Bank of Baroda' },
  { match: /\b(federal|scapia)\b/i, name: 'Federal Bank' },
  { match: /\b(indusind)\b/i, name: 'IndusInd Bank' },
  { match: /\b(pnb|punjab national)\b/i, name: 'Punjab National Bank' },
  { match: /\b(standard chartered)\b/i, name: 'Standard Chartered' },
  { match: /\b(hsbc)\b/i, name: 'HSBC Bank' },
  { match: /\b(jupiter)\b/i, name: 'Jupiter' },
  { match: /\b(au small finance|au bank)\b/i, name: 'AU Small Finance Bank' },
];

/**
 * Resolves issuing bank name for a card.
 * If bank_name is missing, empty, or generic ('Bank'/'Other'),
 * it intelligently detects the issuing bank from the card name / nickname.
 */
export function getCardBankName(card: Partial<UserCardResponse> | null | undefined): string {
  const existing = card?.card_details?.bank_name?.trim();
  if (existing && existing.toLowerCase() !== 'bank' && existing.toLowerCase() !== 'other') {
    return existing;
  }

  const raw = `${card?.nickname || ''} ${card?.card_details?.card_name || ''}`;
  for (const { match, name } of BANK_RULES) {
    if (match.test(raw)) {
      return name;
    }
  }

  return existing || '';
}
