import { useMemo } from "react";
import { MapPin } from "lucide-react";

interface RouteSVGPreviewProps {
  route: [number, number][] | undefined;
  uid: string;
}

export const RouteSVGPreview = ({ route, uid }: RouteSVGPreviewProps) => {
  // Each card gets its own gradient/pattern IDs to prevent DOM conflicts
  const gradId = `routeGrad-${uid}`;
  const gridId = `routeGrid-${uid}`;

  const data = useMemo(() => {
    if (!route || route.length < 2) return null;
    const lats = route.map((p) => p[0]);
    const lngs = route.map((p) => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const pad = 0.1, W = 400, H = 200;
    const toX = (lng: number) => pad * W + ((lng - minLng) / (maxLng - minLng || 1)) * W * (1 - 2 * pad);
    const toY = (lat: number) => (1 - pad) * H - ((lat - minLat) / (maxLat - minLat || 1)) * H * (1 - 2 * pad);
    const d = route.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p[1]).toFixed(1)} ${toY(p[0]).toFixed(1)}`).join(" ");
    return { svgPath: d, fx: toX(route[0][1]), fy: toY(route[0][0]), lx: toX(route[route.length-1][1]), ly: toY(route[route.length-1][0]) };
  }, [route]);

  if (!data) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-purple-950/30 to-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 opacity-30">
          <MapPin size={32} className="text-purple-400" />
          <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Sem rota GPS</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-zinc-950 to-zinc-900 relative">
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
        <defs>
          <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#9333ea" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent" />
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
        <path d={data.svgPath} fill="none" stroke="#9333ea" strokeWidth="6" strokeOpacity="0.15" strokeLinecap="round" strokeLinejoin="round" />
        <path d={data.svgPath} fill="none" stroke={`url(#${gradId})`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={data.fx} cy={data.fy} r="5" fill="#22c55e" />
        <circle cx={data.lx} cy={data.ly} r="5" fill="#9333ea" />
      </svg>
    </div>
  );
};
