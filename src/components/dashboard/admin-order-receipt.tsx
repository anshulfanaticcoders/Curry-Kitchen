"use client";

import { Loader2, Printer, ReceiptText, RotateCw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { OrderReceipt, ReceiptOrderOption } from "@/lib/order-receipt";
import { OrderReceiptView } from "./order-receipt-view";
import styles from "./order-receipt.module.css";

function ReceiptLoader({ orderNumber, retry }: { orderNumber: string; retry: () => void }) {
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 20_000);
    async function load() {
      try {
        const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/receipt`, {
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The receipt could not be loaded.");
        if (active) setReceipt(data);
      } catch (cause) {
        if (active) setError(controller.signal.aborted ? "The request timed out. Please try again." : cause instanceof Error ? cause.message : "The receipt could not be loaded.");
      } finally {
        clearTimeout(timer);
      }
    }
    void load();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [orderNumber]);

  if (error) return (
    <div className={styles.feedback} role="alert">
      <ReceiptText size={28} aria-hidden="true" />
      <h3>Receipt unavailable</h3>
      <p>{error}</p>
      <Button type="button" variant="secondary" onClick={retry}><RotateCw size={17} />Try again</Button>
    </div>
  );
  if (!receipt) return <div className={styles.feedback} role="status"><Loader2 className="animate-spin" size={24} aria-hidden="true" /><p>Loading receipt...</p></div>;

  return (
    <>
      <div className={styles.printToolbar}>
        <Button type="button" variant="secondary" onClick={() => window.print()}><Printer size={17} />Print / Save PDF</Button>
      </div>
      <OrderReceiptView receipt={receipt} />
    </>
  );
}

function ReceiptDialog({ orderNumber, orders, close }: { orderNumber: string; orders: ReceiptOrderOption[]; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const selectId = useId();
  const [selected, setSelected] = useState(orderNumber);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const element = dialog.current!;
    const focused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (focused instanceof HTMLElement && document.contains(focused)) focused.focus();
    };
  }, []);

  return createPortal(
    <div className={styles.printRoot}>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => { if (!dialog.current?.open) close(); }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled)");
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className={styles.dialogHeader}>
          <div><h2 id={titleId}>Order details</h2><p>{selected}</p></div>
          <button type="button" onClick={close} className={styles.close} aria-label="Close receipt"><X size={20} /></button>
        </div>
        {orders.length > 1 ? (
          <div className={styles.orderPicker}>
            <label htmlFor={selectId}>Orders & renewals</label>
            <select id={selectId} value={selected} onChange={(event) => { setSelected(event.target.value); setAttempt(0); }}>
              {orders.map((order) => <option key={order.number} value={order.number}>{order.number} | {order.date}</option>)}
            </select>
          </div>
        ) : null}
        <div className={styles.content} key={selected}>
          <ReceiptLoader key={`${selected}:${attempt}`} orderNumber={selected} retry={() => setAttempt((value) => value + 1)} />
        </div>
      </dialog>
    </div>, document.body,
  );
}

export function AdminOrderReceipt({ orderNumber, orders = [], className }: { orderNumber: string; orders?: ReceiptOrderOption[]; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <ReceiptText size={17} />View receipt
      </Button>
      {open ? <ReceiptDialog orderNumber={orderNumber} orders={orders} close={() => setOpen(false)} /> : null}
    </>
  );
}
