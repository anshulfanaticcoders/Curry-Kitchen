import { receiptStatus, type OrderReceipt } from "@/lib/order-receipt";
import styles from "./order-receipt.module.css";

export function receiptMoney(cents: number | null, currency = "USD") {
  if (cents === null) return "Not recorded";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function receiptDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Los_Angeles" }).format(new Date(value));
}

export function OrderReceiptView({ receipt }: { receipt: OrderReceipt }) {
  const money = (value: number | null) => receiptMoney(value, receipt.currency);
  return (
    <article className={styles.receipt} aria-label={`${receipt.title} ${receipt.number}`}>
      <header className={styles.receiptHeader}>
        <p className={styles.businessName}>Curry Kitchen</p>
        <h3>{receipt.title}</h3>
        <div className={styles.receiptMeta}>
          <span>{receipt.number}</span>
          <span>{receiptDate(receipt.createdAt)}</span>
        </div>
      </header>

      <dl className={styles.facts}>
        <div><dt>Customer</dt><dd>{receipt.customer.name}</dd>{receipt.customer.email ? <dd className={styles.secondary}>{receipt.customer.email}</dd> : null}</div>
        <div><dt>Order status</dt><dd>{receipt.status}</dd><dt className={styles.paymentLabel}>Payment status</dt><dd><span className={styles.status} data-paid={receipt.paymentStatus === "Paid"}>{receipt.paymentStatus}</span></dd></div>
      </dl>

      {receipt.warnings.length ? (
        <section className={styles.warning} aria-label="Receipt record warnings">
          <h4>Record needs review</h4>
          <ul>{receipt.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby={`receipt-items-${receipt.number}`}>
        <h4 id={`receipt-items-${receipt.number}`}>Purchased packages</h4>
        {receipt.items.length ? (
          <ul className={styles.items}>
            {receipt.items.map((item) => (
              <li key={item.id}>
                <div className={styles.itemRow}>
                  <div>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.secondary}>Quantity: {item.quantity} <span aria-hidden="true">/</span> Unit price: {money(item.unitPrice)}</p>
                  </div>
                  <strong>{money(item.total)}</strong>
                </div>
                {item.complimentary.length ? <p className={styles.complimentary}>Complimentary: {item.complimentary.join(", ")}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className={styles.secondary}>No item details recorded.</p>}
      </section>

      <dl className={styles.totals}>
        <div><dt>Package subtotal</dt><dd>{money(receipt.amounts.subtotal)}</dd></div>
        {receipt.amounts.discount !== 0 ? <div><dt>Discount</dt><dd>{receipt.amounts.discount !== null && receipt.amounts.discount > 0 ? "-" : ""}{money(receipt.amounts.discount)}</dd></div> : null}
        <div><dt>Delivery charges</dt><dd>{money(receipt.amounts.delivery)}</dd></div>
        <div><dt>Tax</dt><dd>{money(receipt.amounts.tax)}</dd></div>
        <div className={styles.total}><dt>Order total <span>({receipt.currency})</span></dt><dd>{money(receipt.amounts.total)}</dd></div>
      </dl>

      <section className={styles.section} aria-label="Payments for this order">
        <h4>Payment record</h4>
        {receipt.payments.length ? (
          <ul className={styles.payments}>
            {receipt.payments.map((payment) => (
              <li key={payment.id}>
                <div className={styles.itemRow}>
                  <strong>{payment.method} <span className={styles.secondary}>/ {receiptStatus(payment.status)}</span></strong>
                  <strong>{receiptMoney(payment.amount, payment.currency)} <span className={styles.currency}>{payment.currency}</span></strong>
                </div>
                <p className={styles.secondary}>Recorded {receiptDate(payment.recordedAt)}</p>
                <p className={styles.reference}>Reference: {payment.reference}</p>
              </li>
            ))}
          </ul>
        ) : <p className={styles.secondary}>No payment has been recorded for this order.</p>}
      </section>

      <footer className={styles.note}>
        Amounts are from the original order. Package names may reflect the current catalogue.
      </footer>
    </article>
  );
}
