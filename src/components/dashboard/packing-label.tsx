"use client";

import QRCode from "qrcode";
import { Printer, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function PackingLabel({
  customerId,
  customerName,
  lookupUrl,
}: {
  customerId: string;
  customerName: string;
  lookupUrl: string;
}) {
  const [qrImage, setQrImage] = useState("");
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(lookupUrl, {
      width: 360,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#090909", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrImage(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lookupUrl]);

  const labelCode = `CK-${customerId.slice(-8).toUpperCase()}`;

  return (
    <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
      <div className="dark-band flex items-center gap-3 px-6 py-5 text-white">
        <span className="grid size-10 place-items-center rounded-full bg-saffron text-ink">
          <QrCode size={21} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-saffron">Packing label</p>
          <h2 className="mt-1 font-display text-2xl font-black">Scan before packing</h2>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[10.5rem_1fr] sm:items-center">
        <div className="grid aspect-square place-items-center rounded-lg border border-ink/10 bg-ivory p-3">
          {qrImage ? (
            // QR code is generated locally from the protected packing-record URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrImage} alt={`Scannable packing code for ${customerName}`} className="size-full" />
          ) : qrError ? (
            <span className="px-3 text-center text-sm font-bold text-masala">Unable to create the QR label.</span>
          ) : (
            <span className="text-sm font-bold text-ink/50">Preparing code...</span>
          )}
        </div>
        <div>
          <p className="font-display text-3xl font-black">{customerName}</p>
          <p className="mt-2 text-sm font-bold text-ink/55">
            This single customer code opens the latest delivery address, active package details, included items, and add-ons.
          </p>
          <p className="mt-4 font-mono text-sm font-black tracking-[0.14em] text-masala">{labelCode}</p>
          <Button type="button" variant="secondary" onClick={() => window.print()} className="mt-5">
            <Printer size={18} />
            Print label
          </Button>
        </div>
      </div>
    </section>
  );
}
