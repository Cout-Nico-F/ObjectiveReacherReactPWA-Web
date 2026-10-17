import { LAUNCH_DEADLINE_STORAGE_KEY } from "../constants";

export function getLaunchEndTimestamp(): number {
  try {
    const saved = localStorage.getItem(LAUNCH_DEADLINE_STORAGE_KEY);
    if (saved) {
      const val = Number(saved);
      if (val > Date.now()) return val;
    }
    // Oferta especial de bienvenida: 6 días, 18 horas y 30 minutos desde la activación
    const newEnd = Date.now() + (6 * 24 * 3600 + 18 * 3600 + 30 * 60) * 1000;
    localStorage.setItem(LAUNCH_DEADLINE_STORAGE_KEY, String(newEnd));
    return newEnd;
  } catch {
    return Date.now() + 585000000;
  }
}