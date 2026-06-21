interface PortionSummary {
  id: number;
  weight_g: number | null;
  priority: number;
  rank: number;
}

interface SmartDefault {
  portion_id: number;
  quantity: number;
}

export function selectSmartDefaultPortion(portions: PortionSummary[]): SmartDefault | null {
  const meaningful = portions
    .filter((p) => p.weight_g != null && p.weight_g !== 1)
    .sort((a, b) => b.priority - a.priority || a.rank - b.rank);

  if (meaningful.length > 0) {
    return { portion_id: meaningful[0].id, quantity: 1 };
  }

  const fallback = portions[0];
  if (fallback) {
    return { portion_id: fallback.id, quantity: 100 };
  }

  return null;
}
