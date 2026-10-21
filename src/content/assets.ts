export interface AssetDef {
  id: string; label: string; short: string; icon: string;
  cost: number; upkeep: number; income: number;
  morale?: number; fame?: number; reputation?: number;
  desc: string;
}

export const ASSETS: AssetDef[] = [
  { id: 'mansion', label: 'Mansión', short: 'Mansión', icon: '🏠', cost: 4_500_000, upkeep: 180_000, income: 0, fame: 6, morale: 5, desc: 'Una casa con cancha privada, gimnasio y vistas. El recibo llega cada verano.' },
  { id: 'apartment', label: 'Ático', short: 'Ático', icon: '🏙️', cost: 900_000, upkeep: 36_000, income: 0, fame: 2, morale: 3, desc: 'Un ático en el centro. Menos lujo, menos gastos.' },
  { id: 'supercar', label: 'Superdeportivo', short: 'Coche', icon: '🏎️', cost: 650_000, upkeep: 45_000, income: 0, fame: 4, morale: 2, desc: 'Un coche que llama la atención en cada semáforo.' },
  { id: 'jet', label: 'Jet privado', short: 'Jet', icon: '✈️', cost: 9_000_000, upkeep: 450_000, income: 0, fame: 8, morale: 3, desc: 'Viajar sin escalas ni colas. La aerolínea no perdona.' },
  { id: 'entourage', label: 'Equipo personal', short: 'Equipo', icon: '🧑‍🤝‍🧑', cost: 350_000, upkeep: 220_000, income: 0, fame: 3, morale: 4, desc: 'Preparador, fisio, cocinero y escolta. Nóminas todos los meses.' },
  { id: 'rentals', label: 'Cartera de alquileres', short: 'Alquileres', icon: '🏢', cost: 1_800_000, upkeep: 40_000, income: 160_000, reputation: 2, desc: 'Inmuebles que trabajan para ti. Ingresos anuales, con mantenimiento.' },
];

export const assetById = (id: string) => ASSETS.find(a => a.id === id);
