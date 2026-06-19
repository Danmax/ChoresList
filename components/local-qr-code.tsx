"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type LocalQrCodeProps = {
  value: string;
  alt: string;
  size?: number;
  className?: string;
};

export function LocalQrCode({ value, alt, size = 220, className }: LocalQrCodeProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    setSrc("");
    if (!value) return () => { active = false; };

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((dataUrl) => {
      if (active) setSrc(dataUrl);
    }).catch(() => {
      if (active) setSrc("");
    });

    return () => { active = false; };
  }, [size, value]);

  if (!src) {
    return <div role="img" aria-label={`${alt} loading`} className={className} />;
  }

  return <img src={src} alt={alt} className={className} />;
}
