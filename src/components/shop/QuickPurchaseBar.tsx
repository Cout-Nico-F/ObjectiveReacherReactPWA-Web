import React from 'react';
import { IndieSupportPack, PaymentGatewayChoice } from '../../monetization';

export function QuickPurchaseBar({
  pack,
  onPurchase,
  selectedGateway,
}: {
  pack: IndieSupportPack;
  onPurchase: (pack: IndieSupportPack, gateway: PaymentGatewayChoice) => void;
  selectedGateway: PaymentGatewayChoice;
}) {
  return (
    <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#131221]/95 border-t border-[#2C2742] backdrop-blur-sm z-20 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-[#A8A3B8] uppercase">
          Pack Destacado
        </div>
        <div className="text-sm font-extrabold text-white truncate">
          {pack.emoji} {pack.title}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onPurchase(pack, selectedGateway)}
        className="px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[#FFD54F] to-[#FFAB00] text-[#131221] text-sm font-extrabold hover:brightness-110 active:scale-95 transition shadow-lg shrink-0"
      >
        🚀 Comprar Pase Fundador con 1 Clic
      </button>
    </div>
  );
}
