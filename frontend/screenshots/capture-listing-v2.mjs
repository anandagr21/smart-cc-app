// Capture real, current-theme screens for the Play Store listing.
// Runs against the live Expo web dev server (port 8081) and mocks the API
// with realistic Indian-card data so the UI renders its real states.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'listing-raw');
const BASE = 'http://localhost:8081';
mkdirSync(OUT, { recursive: true });

const CARD1 = { id:'c1', user_id:'u1', card_catalog_id:'cat1', nickname:null, last_4_digits:'4821', network_override:null, credit_limit:300000, current_spend:81500, annual_spend:210000, billing_date:3, due_date:20, card_status:'ACTIVE', created_at:'2026-01-01', updated_at:'2026-01-01', card_details:{ id:'cat1', card_name:'Swiggy HDFC Bank Credit Card', bank_name:'HDFC Bank', network:'VISA', joining_fee:0, annual_fee:500, fee_waiver_spend_threshold:200000, base_point_value:1, is_active:true }, effective_annual_fee:500, effective_fee_waiver_threshold:200000, remaining_spend_for_waiver:18500, waiver_achieved:false, fee_waiver_progress_percent:90, days_until_renewal:42, urgency_level:'HIGH' };
const CARD2 = { id:'c2', user_id:'u1', card_catalog_id:'cat2', nickname:null, last_4_digits:'1092', network_override:null, credit_limit:200000, current_spend:42000, annual_spend:150000, billing_date:15, due_date:2, card_status:'ACTIVE', created_at:'2026-01-01', updated_at:'2026-01-01', card_details:{ id:'cat2', card_name:'Amazon Pay ICICI Bank Credit Card', bank_name:'ICICI Bank', network:'VISA', joining_fee:0, annual_fee:0, fee_waiver_spend_threshold:null, base_point_value:1, is_active:true }, effective_annual_fee:0, effective_fee_waiver_threshold:null, remaining_spend_for_waiver:null, waiver_achieved:true };
const CARD3 = { id:'c3', user_id:'u1', card_catalog_id:'cat3', nickname:null, last_4_digits:'7710', network_override:null, credit_limit:150000, current_spend:23000, annual_spend:90000, billing_date:22, due_date:9, card_status:'ACTIVE', created_at:'2026-01-01', updated_at:'2026-01-01', card_details:{ id:'cat3', card_name:'IDFC FIRST Power Plus', bank_name:'IDFC FIRST Bank', network:'VISA', joining_fee:0, annual_fee:0, fee_waiver_spend_threshold:null, base_point_value:1, is_active:true }, effective_annual_fee:0, effective_fee_waiver_threshold:null, remaining_spend_for_waiver:null, waiver_achieved:false };

const paged = (data) => ({ data, meta:{ total:data.length, page:0, page_size:50, has_next:false } });

const SWIGGY_RECO = { calculation_id:'calc-1', resolved_merchant_name:'Swiggy', resolution_confidence:0.97, resolution_type:'exact', resolution_source:'catalog', merchant_id:'m1', normalized_merchant:'Swiggy', category:'FOOD',
  all_ranked_cards:[
    { card_id:'c1', card_name:'Swiggy HDFC Bank Credit Card', immediate_reward_value:60, fee_waiver_progress_impact:0, simplification_score:0.9, blended_total_value:60, explanation:'10% cashback on Swiggy orders vs 1% on your other cards — clear winner for food.', confidence_label:'OPTIMAL', reward_type:'CASHBACK', cashback_amount:60, reward_points:null },
    { card_id:'c2', card_name:'Amazon Pay ICICI Bank Credit Card', immediate_reward_value:6, fee_waiver_progress_impact:0, simplification_score:0.8, blended_total_value:6, explanation:'1% base rewards — fine, but not worth using here.', confidence_label:'OK', reward_type:'CASHBACK', cashback_amount:6, reward_points:null },
  ],
  best_cashback_card:null, best_fee_waiver_card:null, best_balanced_card:null, best_simplify_card:null, explanations:[], warnings:[] };

const MONTHLY = { period:'2026-08', transaction_count:46, total_rewards_optimized:2280, missed_opportunity_value:340, optimization_rate:86, strongest_category:'FOOD', strongest_card:'Swiggy HDFC Bank Credit Card', improvement_delta:12, streaks:[], narratives:[], forecasts:[], supporting_metrics:{} };

const TX = [
  { id:'t1', user_id:'u1', user_card_id:'c1', merchant_name:'Swiggy', amount:620, payment_mode:'online', transaction_date:'2026-08-20', category:'FOOD', normalized_merchant:'Swiggy', status:'posted', created_at:'2026-08-20', updated_at:'2026-08-20', reward_earned:62 },
  { id:'t2', user_id:'u1', user_card_id:'c2', merchant_name:'Amazon', amount:2400, payment_mode:'online', transaction_date:'2026-08-18', category:'ECOMMERCE', normalized_merchant:'Amazon', status:'posted', created_at:'2026-08-18', updated_at:'2026-08-18', reward_earned:120 },
  { id:'t3', user_id:'u1', user_card_id:'c3', merchant_name:'HPCL Fuel', amount:2000, payment_mode:'offline', transaction_date:'2026-08-15', category:'FUEL', normalized_merchant:'HPCL', status:'posted', created_at:'2026-08-15', updated_at:'2026-08-15', reward_earned:100 },
  { id:'t4', user_id:'u1', user_card_id:'c1', merchant_name:'Swiggy', amount:410, payment_mode:'online', transaction_date:'2026-08-11', category:'FOOD', normalized_merchant:'Swiggy', status:'posted', created_at:'2026-08-11', updated_at:'2026-08-11', reward_earned:41 },
];

const AUTH = { auth_token:'screenshot_token_v2', auth_user: JSON.stringify({ id:'u1', email:'rahul@example.com', full_name:'Rahul Sharma', role:'user', terms_accepted:true, is_premium:false }) };

const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

async function main() {
  const browser = await chromium.launch({ headless:true });
  const ctx = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:3 });
  const page = await ctx.newPage();

  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const reply = (s,b)=>route.fulfill({ status:s, contentType:'application/json', body:JSON.stringify(b) });
    if (url.includes('/recommendations/evaluate')) return reply(200,{data:SWIGGY_RECO});
    if (url.includes('/cards')) return reply(200,paged([CARD1,CARD2,CARD3]));
    if (url.includes('/monthly-intelligence/')) return reply(200,MONTHLY);
    if (url.includes('/insights/')) return reply(200,[]);
    if (url.includes('/transactions')) return reply(200,paged(TX));
    if (url.includes('/personality/')) return reply(200,{active_personality:'BALANCED_INTELLIGENCE', is_inferred:false, confidence_score:0.8});
    if (url.includes('/search/events')) return reply(200,{ok:true});
    return reply(200, method==='GET' ? {data:[],meta:{}} : {ok:true});
  });

  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate((auth)=>{ localStorage.setItem('auth_token',auth.auth_token); localStorage.setItem('auth_user',auth.auth_user); localStorage.setItem('app_theme_mode','light'); localStorage.setItem('smartcc_onboarding_complete','true'); localStorage.setItem('smartcc_onboarding_persona','MAX_REWARDS'); }, AUTH);
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await sleep(4000);

  // 2 — Dashboard
  await page.screenshot({ path: join(OUT,'02-dashboard.png') });

  // 1 — Recommendation sheet (Swiggy ₹600)
  await page.getByText('Which card should I use?').first().click();
  await sleep(1500);
  const amt = page.locator('[data-testid="amount-input"]');
  await amt.click();
  await page.keyboard.type('600');
  await sleep(600);
  await page.getByText('Swiggy', { exact:true }).first().click();
  await page.waitForSelector('text=Recommended Card', { timeout:8000 });
  await sleep(600);
  await page.screenshot({ path: join(OUT,'01-recommendation.png') });

  // 3 — Wallet
  await page.goto(`${BASE}/cards`,{waitUntil:'networkidle',timeout:30000});
  await sleep(3500);
  await page.screenshot({ path: join(OUT,'03-wallet.png') });

  // 4 — Fee waiver (scroll dashboard to ANNUAL FEES)
  await page.goto(BASE,{waitUntil:'networkidle',timeout:30000});
  await sleep(3500);
  await page.evaluate(()=>{ const sc = Array.from(document.querySelectorAll('div')).find(el=>el.scrollHeight>el.clientHeight+300 && getComputedStyle(el).overflowY!=='visible'); if (sc) sc.scrollTop = 760; });
  await sleep(1200);
  await page.screenshot({ path: join(OUT,'04-fee-waiver.png') });

  // 5 — Login / trust
  await ctx.clearCookies();
  await page.goto(`${BASE}/(auth)/login`,{waitUntil:'networkidle',timeout:30000});
  await page.evaluate(()=>localStorage.clear());
  await page.goto(`${BASE}/(auth)/login`,{waitUntil:'networkidle',timeout:30000});
  await sleep(3000);
  await page.screenshot({ path: join(OUT,'05-login.png') });

  await browser.close();
  console.log('DONE →', OUT);
}
main().catch((e)=>{ console.error('FATAL',e); process.exit(1); });
