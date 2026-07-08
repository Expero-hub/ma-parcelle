import {
  Users, Shield, LayoutGrid, Building2, Store, MapPin, Map, LandPlot,
  Bookmark, FileText, CalendarClock, Wallet, Gauge, BarChart3, TrendingUp,
  Receipt, CircleDot, type LucideIcon,
} from "lucide-react";

/** Table des noms d'icônes seedés → composants lucide (imports nommés = stables). */
const ICONS: Record<string, LucideIcon> = {
  users: Users,
  shield: Shield,
  "layout-grid": LayoutGrid,
  "building-2": Building2,
  store: Store,
  "map-pin": MapPin,
  map: Map,
  "land-plot": LandPlot,
  bookmark: Bookmark,
  "file-text": FileText,
  "calendar-clock": CalendarClock,
  wallet: Wallet,
  gauge: Gauge,
  "bar-chart-3": BarChart3,
  "trending-up": TrendingUp,
  receipt: Receipt,
};

export function MenuIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || CircleDot;
  return <Icon className={className} aria-hidden />;
}
