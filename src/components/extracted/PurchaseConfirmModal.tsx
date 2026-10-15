// 1. Exportamos el tipo que busca IndieEmporium
export interface PurchaseItem {
  id?: string;
  name?: string;
  title?: string;
  icon?: string;
  emoji?: string;
  cost?: number;
  price?: number;
  gemCost?: number;
  requiredGems?: number;
  gems?: number;
  [key: string]: any;
}

// 2. Interfaz de las Props del modal
export interface PurchaseConfirmModalProps {
  item: PurchaseItem | any;
  userGems: number;
  onClose: () => void;
  onConfirm: () => void;
  onOpenShop?: () => void;
}

export const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  item,
  userGems,
  onClose,
  onConfirm,
  onOpenShop,
}) => {
  if (!item || (typeof item === 'object' && Object.keys(item).length === 0)) {
    return null;
  }

  const cost = Number(
    item?.price ?? item?.cost ?? item?.gemCost ?? item?.requiredGems ?? item?.gems ?? 0
  );
  
  const currentGems = Number(userGems ?? 0);
  const canAfford = currentGems >= cost;

  const handleShopRedirect = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    if (typeof onOpenShop === 'function') {
      onOpenShop();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xs rounded-[22px] bg-[#1E1C2E] border border-[#483F6B] p-5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Ícono / Avatar del objeto */}
        <div className="w-16 h-16 mx-auto rounded-full bg-[#29243B] border border-[#5C4F85] flex items-center justify-center text-3xl shadow-inner">
          {item?.icon || item?.emoji || '💎'}
        </div>

        {/* Título e Info */}
        <div>
          <h3 className="text-base font-bold text-white">
            ¿Desbloquear {item?.name || item?.title || 'este objeto'}?
          </h3>
          <p className="text-xs text-[#A8A3B8] mt-1">
            Se descontará de tu saldo de gemas.
          </p>
        </div>

        {/* Detalle del precio */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] bg-[#141221] border border-[#2D2845] text-xs font-semibold">
          <span className="text-[#A8A3B8]">Costo:</span>
          <span className="text-[#9AF0AE] font-mono-tabular font-bold flex items-center gap-1">
            💎 {cost}
          </span>
        </div>

        {/* Botones */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-[10px] bg-[#29253B] hover:bg-[#342F4B] text-[#C9C2D8] text-xs font-bold transition active:scale-95"
          >
            Cancelar
          </button>

          {canAfford ? (
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-2 rounded-[10px] text-xs font-extrabold text-white bg-gradient-to-r from-[#8C5CE0] to-[#65499C] hover:brightness-110 shadow-[0_4px_12px_rgba(140,92,224,0.3)] transition active:scale-95"
            >
              Confirmar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleShopRedirect}
              className="px-3 py-2 rounded-[10px] text-xs font-extrabold text-white bg-gradient-to-r from-[#7549B8] to-[#9B6BFF] hover:brightness-110 shadow-[0_4px_12px_rgba(117,73,184,0.3)] transition active:scale-95 flex items-center justify-center gap-1"
            >
              <span>💎</span>
              <span>Conseguir</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default PurchaseConfirmModal;