import { Alert, Linking } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getOrderForBill, updateCustomerDetails } from '../database/actions';
import { askPhone } from '../../components/PhonePrompt';
import { getSession } from './session';

// WhatsApp sharing without the paid Business API: a wa.me deep link opens the
// shop's own WhatsApp with the message pre-filled, and the shopkeeper taps Send.
// Messages come from the shop's own number, which customers already trust.

const rupees = n => `₹${(Number(n) || 0).toFixed(2)}`;

// Indian numbers → 91XXXXXXXXXX (wa.me wants country code, digits only).
export function toWhatsAppNumber(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    return digits.length >= 10 ? digits : null;
}

export async function openWhatsApp(phone, text) {
    const number = toWhatsAppNumber(phone);
    const encoded = encodeURIComponent(text);
    // Without a number WhatsApp opens its contact picker with the text ready.
    const url = number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    try {
        await Linking.openURL(url);
    } catch {
        Alert.alert('WhatsApp not available', 'Install WhatsApp on this phone to send messages.');
    }
}

// upi://pay link — tapping it on the customer's phone opens GPay/PhonePe/Paytm
// with the shop's UPI ID and the amount already filled in.
export function upiPayLink({ upiId, shopName, amount, note }) {
    if (!upiId) return null;
    const params = [
        `pa=${encodeURIComponent(upiId)}`,
        `pn=${encodeURIComponent(shopName || 'Shop')}`,
        amount ? `am=${(Number(amount) || 0).toFixed(2)}` : null,
        'cu=INR',
        note ? `tn=${encodeURIComponent(note)}` : null,
    ].filter(Boolean);
    return `upi://pay?${params.join('&')}`;
}

// ── Khata reminder ──────────────────────────────────────────────────────────────

export function buildReminderText({ customer, balance, entries = [] }) {
    const { business } = getSession();
    const shop = business?.name || 'our shop';
    const recent = entries.slice(0, 3).map(e => {
        const date = new Date(e.entryAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        return `• ${date}: ${e.type === 'repayment' ? 'Paid' : 'Credit'} ${rupees(e.amount)}`;
    });
    const pay = upiPayLink({ upiId: business?.upi_id, shopName: shop, amount: balance, note: 'Khata payment' });

    return [
        `Namaste ${customer.name} ji,`,
        ``,
        `Your pending balance at *${shop}* is *${rupees(balance)}*.`,
        recent.length ? `\nRecent entries:\n${recent.join('\n')}` : null,
        pay ? `\nPay by UPI: ${pay}` : null,
        business?.upi_id ? `UPI ID: ${business.upi_id}` : null,
        ``,
        `Thank you! 🙏`,
    ].filter(v => v !== null).join('\n');
}

// When a saved customer has no number, ask for one right here and store it on
// their record — so the send goes through instead of dead-ending in an alert.
async function ensureCustomerPhone(customer, purpose) {
    if (customer?.phone) return customer.phone;
    const phone = await askPhone({
        title: customer ? `Phone for ${customer.name}` : 'Send bill to',
        message: customer
            ? `Add their WhatsApp number to ${purpose}. It will be saved for next time.`
            : `Walk-in sale — enter the WhatsApp number to ${purpose}.`,
    });
    if (!phone) return null;
    if (customer) await updateCustomerDetails({ customerId: customer.id, phone });
    return phone;
}

// Returns the number used (so callers can refresh what they show), or null if cancelled.
export async function sendKhataReminder({ customer, balance, entries }) {
    const phone = await ensureCustomerPhone(customer, 'send the reminder');
    if (!phone) return null;
    await openWhatsApp(phone, buildReminderText({ customer, balance, entries }));
    return phone;
}

// ── Bills ───────────────────────────────────────────────────────────────────────

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function billNumber(order) {
    return order.id.replace(/-/g, '').slice(-8).toUpperCase();
}

function billHtml({ order, customer, lines }) {
    const { business } = getSession();
    const date = new Date(order.saleAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const rows = lines.map((l, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(l.name)}</td>
          <td class="r">${l.quantity}${l.unit ? ' ' + esc(l.unit) : ''}</td>
          <td class="r">${rupees(l.unitPrice)}</td>
          <td class="r">${rupees(l.amount)}</td>
        </tr>`).join('');
    const pay = order.paymentMode === 'credit' ? 'Credit (khata)' : (order.paymentMode || 'cash').toUpperCase();

    return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 14mm; }
  body { font-family: -apple-system, Roboto, Arial, sans-serif; color: #111; font-size: 13px; }
  .head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 12px; }
  .shop { font-size: 22px; font-weight: 800; }
  .muted { color: #555; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; border-bottom: 1px solid #111; padding: 6px 4px; font-size: 12px; }
  td { padding: 6px 4px; border-bottom: 1px solid #ddd; }
  .r { text-align: right; }
  .total td { border-top: 2px solid #111; border-bottom: none; font-size: 16px; font-weight: 800; }
  .foot { text-align: center; margin-top: 24px; color: #555; }
</style></head><body>
  <div class="head">
    <div class="shop">${esc(business?.name || 'Shop')}</div>
    ${business?.address ? `<div class="muted">${esc(business.address)}</div>` : ''}
    ${business?.phone ? `<div class="muted">Ph: ${esc(business.phone)}</div>` : ''}
    ${business?.gstin ? `<div class="muted">GSTIN: ${esc(business.gstin)}</div>` : ''}
  </div>
  <div class="meta">
    <div><b>Bill #${billNumber(order)}</b><br><span class="muted">${esc(date)}</span></div>
    <div class="r">${customer ? `<b>${esc(customer.name)}</b>${customer.phone ? `<br><span class="muted">${esc(customer.phone)}</span>` : ''}` : '<span class="muted">Walk-in customer</span>'}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}
      <tr class="total"><td></td><td colspan="3">Total</td><td class="r">${rupees(order.totalAmount)}</td></tr>
    </tbody>
  </table>
  <p>Payment: <b>${esc(pay)}</b></p>
  ${business?.upi_id && order.paymentMode === 'credit' ? `<p>Pay by UPI: <b>${esc(business.upi_id)}</b></p>` : ''}
  <div class="foot">Thank you for shopping with us!</div>
</body></html>`;
}

// Bill as a PDF → Android share sheet (WhatsApp, Gmail, Drive, print…).
export async function shareBillPdf(orderId) {
    try {
        const data = await getOrderForBill(orderId);
        const { uri } = await Print.printToFileAsync({ html: billHtml(data) });
        if (!(await Sharing.isAvailableAsync())) {
            Alert.alert('Sharing not available on this device');
            return;
        }
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Bill #${billNumber(data.order)}`,
            UTI: 'com.adobe.pdf',
        });
    } catch (e) {
        console.error('[bill] share failed', e);
        Alert.alert('Could not create the bill', 'Please try again.');
    }
}

// Plain-text bill straight into the customer's WhatsApp chat — no attachment step.
export async function sendBillOnWhatsApp(orderId) {
    const { order, customer, lines } = await getOrderForBill(orderId);
    const { business } = getSession();
    const text = [
        `*${business?.name || 'Bill'}*`,
        `Bill #${billNumber(order)} · ${new Date(order.saleAt).toLocaleDateString('en-IN')}`,
        ``,
        ...lines.map(l => `${l.name} × ${l.quantity} = ${rupees(l.amount)}`),
        ``,
        `*Total: ${rupees(order.totalAmount)}*  (${order.paymentMode === 'credit' ? 'on khata' : (order.paymentMode || 'cash').toUpperCase()})`,
        ``,
        `Thank you! 🙏`,
    ].join('\n');
    const phone = await ensureCustomerPhone(customer, 'send the bill');
    if (!phone) return;
    await openWhatsApp(phone, text);
}
