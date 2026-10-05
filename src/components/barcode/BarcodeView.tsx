import React, { useMemo } from 'react';
import { generateBarcodeSvg, BarcodeRenderOptions } from '../../utils/barcode128';

interface BarcodeViewProps {
  value: string;
  options?: BarcodeRenderOptions;
  className?: string;
}

export default function BarcodeView({ value, options, className = '' }: BarcodeViewProps) {
  const svgHtml = useMemo(() => {
    if (!value || value.trim().length === 0) {
      return null;
    }
    try {
      return generateBarcodeSvg(value.trim(), options);
    } catch {
      return null;
    }
  }, [value, options]);

  if (!svgHtml) {
    return (
      <div className={`flex items-center justify-center p-2 bg-gray-100 border border-dashed border-gray-400 text-gray-500 text-[10px] font-mono ${className}`}>
        [لا يوجد باركود صالح]
      </div>
    );
  }

  return (
    <div
      className={`inline-block ${className}`}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
