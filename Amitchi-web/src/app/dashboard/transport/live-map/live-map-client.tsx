"use client";

import * as React from "react";
import {
  Bus,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Clock,
  Gauge,
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Building2,
  Compass,
  Filter,
  Layers,
  LocateFixed,
  Route,
  X,
  Sparkles,
  Map as MapIcon,
  CheckCircle2,
} from "lucide-react";
import {
  Locality,
  LOCALITIES_DATABASE,
  searchLocalities,
  calculateDistanceKm,
  formatDistance,
} from "@/domains/transport/data/localities";

interface RouteStop {
  id: string;
  stopName: string;
  timeMorning?: string;
  timeEvening?: string;
  order: number;
  lat?: number;
  lng?: number;
}

interface TransportRoute {
  id: number;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  capacity?: number;
  stops?: RouteStop[];
  status?: string;
}

interface LiveTrip {
  id: number;
  routeId: number;
  tripDate: string;
  tripType: string;
  driverName?: string;
  vehicleNumber?: string;
  status: string;
  currentStop?: string;
  currentLat?: number;
  currentLng?: number;
  speedKmh?: number;
  heading?: number;
  lastGpsAt?: string;
  estimatedArrivalMinutes?: number;
  route?: TransportRoute;
}

interface SchoolLocation {
  lat: number;
  lng: number;
  label: string;
  region: string;
}

interface Props {
  schoolId: number;
  initialRoutes: TransportRoute[];
  initialTrips: LiveTrip[];
  schoolLocation: SchoolLocation;
}

export default function LiveMapClient({
  schoolId,
  initialRoutes,
  initialTrips,
  schoolLocation,
}: Props) {
  const [trips, setTrips] = React.useState<LiveTrip[]>(initialTrips);
  const [selectedTripId, setSelectedTripId] = React.useState<number | null>(
    initialTrips[0]?.id || null
  );

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedVillage, setSelectedVillage] = React.useState<Locality | null>(null);
  const [isVillageDropdownOpen, setIsVillageDropdownOpen] = React.useState<boolean>(false);
  const [activeFocusMode, setActiveFocusMode] = React.useState<"bus" | "village" | "school">("bus");

  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Poll active bus positions every 5 seconds
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/transport/gps/live");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTrips(json.data);
        }
      } catch (err) {
        console.warn("[GPS Map Poll Error]:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const stops = (selectedTrip?.route?.stops as RouteStop[]) || [];

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/transport/gps/live");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrips(json.data);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Localities / Villages in the school's region
  const regionalLocalities = React.useMemo(() => {
    return LOCALITIES_DATABASE.filter(
      (loc) => loc.region.toLowerCase() === schoolLocation.region.toLowerCase()
    );
  }, [schoolLocation.region]);

  // Village search suggestions
  const villageSuggestions = React.useMemo(() => {
    if (!searchQuery.trim()) return regionalLocalities.slice(0, 6);
    return searchLocalities(searchQuery, schoolLocation.region).slice(0, 8);
  }, [searchQuery, schoolLocation.region, regionalLocalities]);

  // Filtered trips based on search text AND selected village
  const filteredTrips = React.useMemo(() => {
    return trips.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchVehicle = t.vehicleNumber?.toLowerCase().includes(q) || false;
      const matchDriver = t.driverName?.toLowerCase().includes(q) || false;
      const matchRoute = t.route?.routeName?.toLowerCase().includes(q) || false;
      const matchStop = (t.route?.stops || []).some((s: any) =>
        s.stopName?.toLowerCase().includes(q)
      );

      // If a village is specifically selected, filter for routes that serve this village or are close
      if (selectedVillage) {
        const villageWord = selectedVillage.name.toLowerCase();
        const routeServesVillage =
          matchRoute ||
          matchStop ||
          t.route?.routeName?.toLowerCase().includes(villageWord) ||
          (t.route?.stops || []).some((s: any) =>
            s.stopName?.toLowerCase().includes(villageWord)
          );
        return routeServesVillage;
      }

      if (!q) return true;
      return matchVehicle || matchDriver || matchRoute || matchStop;
    });
  }, [trips, searchQuery, selectedVillage]);

  // Determine current map center coordinates
  const mapCoordinates = React.useMemo(() => {
    if (activeFocusMode === "school") {
      return {
        lat: schoolLocation.lat,
        lng: schoolLocation.lng,
        label: schoolLocation.label,
        zoomDelta: 0.025,
      };
    }

    if (activeFocusMode === "village" && selectedVillage) {
      return {
        lat: selectedVillage.lat,
        lng: selectedVillage.lng,
        label: `${selectedVillage.name} (${selectedVillage.region})`,
        zoomDelta: 0.025,
      };
    }

    // Bus Focus Mode
    const busLat = selectedTrip?.currentLat || schoolLocation.lat;
    const busLng = selectedTrip?.currentLng || schoolLocation.lng;
    return {
      lat: busLat,
      lng: busLng,
      label: selectedTrip ? `Bus ${selectedTrip.vehicleNumber}` : schoolLocation.label,
      zoomDelta: 0.035,
    };
  }, [activeFocusMode, selectedVillage, selectedTrip, schoolLocation]);

  // Distances calculations
  const distanceBusToSchool = React.useMemo(() => {
    if (!selectedTrip?.currentLat || !selectedTrip?.currentLng) return null;
    return calculateDistanceKm(
      selectedTrip.currentLat,
      selectedTrip.currentLng,
      schoolLocation.lat,
      schoolLocation.lng
    );
  }, [selectedTrip, schoolLocation]);

  const distanceVillageToSchool = React.useMemo(() => {
    if (!selectedVillage) return null;
    return calculateDistanceKm(
      selectedVillage.lat,
      selectedVillage.lng,
      schoolLocation.lat,
      schoolLocation.lng
    );
  }, [selectedVillage, schoolLocation]);

  const handleSelectVillage = (loc: Locality) => {
    setSelectedVillage(loc);
    setSearchQuery(loc.name);
    setIsVillageDropdownOpen(false);
    setActiveFocusMode("village");

    // If there is a trip that serves this village, select it
    const matchingTrip = trips.find(
      (t) =>
        t.route?.routeName?.toLowerCase().includes(loc.name.toLowerCase()) ||
        (t.route?.stops || []).some((s: any) =>
          s.stopName?.toLowerCase().includes(loc.name.toLowerCase())
        )
    );
    if (matchingTrip) {
      setSelectedTripId(matchingTrip.id);
    }
  };

  const handleClearVillageFilter = () => {
    setSelectedVillage(null);
    setSearchQuery("");
    setActiveFocusMode("bus");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* ── Left Sidebar: Fleet, Search & Villages ── */}
      <div className="w-80 md:w-96 flex flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl z-20">
        {/* Header & School Location Badge */}
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                <Radio className="size-4 text-emerald-400" /> Radar GPS Flotte
              </h1>
            </div>
            <button
              onClick={handleManualRefresh}
              className={`p-1.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all ${
                isRefreshing ? "animate-spin text-indigo-400" : ""
              }`}
              title="Rafraîchir les positions"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          {/* School Geographic Reference Card */}
          <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/30 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="size-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">
                  {schoolLocation.label}
                </p>
                <p className="text-[10px] text-indigo-300 flex items-center gap-1">
                  <span>Pôle Géographique :</span>
                  <strong>{schoolLocation.region}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveFocusMode("school")}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                activeFocusMode === "school"
                  ? "bg-indigo-600 text-white border-indigo-400"
                  : "bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20"
              }`}
              title="Centrer la carte sur l'établissement"
            >
              Établissement
            </button>
          </div>

          {/* Village / Locality / Bus Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher village, quartier, bus, ligne..."
              value={searchQuery}
              onFocus={() => setIsVillageDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsVillageDropdownOpen(true);
              }}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {(searchQuery || selectedVillage) && (
              <button
                onClick={handleClearVillageFilter}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            )}

            {/* Village Suggestions Dropdown */}
            {isVillageDropdownOpen && villageSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-30 p-2 max-h-64 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Villages & Quartiers ({schoolLocation.region})</span>
                  <button
                    onClick={() => setIsVillageDropdownOpen(false)}
                    className="hover:text-white"
                  >
                    Fermer
                  </button>
                </div>
                {villageSuggestions.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectVillage(loc)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-indigo-600/20 hover:text-white cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          {loc.name} {loc.nameAr ? `(${loc.nameAr})` : ""}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {loc.type} · {loc.region}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-indigo-400 font-medium">
                      {formatDistance(
                        calculateDistanceKm(
                          loc.lat,
                          loc.lng,
                          schoolLocation.lat,
                          schoolLocation.lng
                        )
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Regional Quick Chips (e.g. Bagalam, Tibiri, Ali Dan Sofo...) */}
          {regionalLocalities.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Villages & Quartiers de la zone ({schoolLocation.region}) :
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={handleClearVillageFilter}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    !selectedVillage
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-sm"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  Tous
                </button>
                {regionalLocalities.slice(0, 5).map((loc) => {
                  const isLocSelected = selectedVillage?.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectVillage(loc)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        isLocSelected
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-sm scale-105"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fleet List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredTrips.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Bus className="size-8 mx-auto text-slate-600 animate-pulse" />
              <p>Aucun bus trouvé pour cette zone géographique.</p>
              {selectedVillage && (
                <button
                  onClick={handleClearVillageFilter}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/50 transition-colors"
                >
                  Réinitialiser le filtre
                </button>
              )}
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isSelected = trip.id === selectedTrip?.id;
              const hasGps = trip.currentLat != null && trip.currentLng != null;

              return (
                <div
                  key={trip.id}
                  onClick={() => {
                    setSelectedTripId(trip.id);
                    setActiveFocusMode("bus");
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/25 border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center shadow-inner ${
                          hasGps
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        <Bus className="size-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white">
                          {trip.vehicleNumber || trip.route?.vehicleNumber || "Bus"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px] font-medium">
                          {trip.route?.routeName || "Ligne Scolaire"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                          trip.status === "En cours" || trip.status === "EN_ROUTE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700/60 text-slate-300"
                        }`}
                      >
                        {trip.status === "EN_ROUTE" ? "En cours" : trip.status}
                      </span>
                      {hasGps && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1 justify-end">
                          <Gauge className="size-3" /> {trip.speedKmh || 0} km/h
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-indigo-400 shrink-0" />
                      <span className="truncate max-w-[110px]">
                        {trip.currentStop || "En transit"}
                      </span>
                    </span>
                    {trip.driverName && (
                      <span className="truncate max-w-[90px] font-semibold text-slate-300">
                        {trip.driverName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Map Canvas Area ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
        {/* Top Floating Telemetry & Focus Controls */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                <Navigation className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm text-white">
                    {selectedTrip?.route?.routeName || "Circuit Scolaire"}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Zone : {schoolLocation.region}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>
                    Véhicule : <strong className="text-white">{selectedTrip?.vehicleNumber}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Chauffeur : <strong className="text-white">{selectedTrip?.driverName || "Assigné"}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Focus Mode Selector & Telemetry stats */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Map Target Indicator */}
              <div className="flex items-center rounded-xl bg-slate-800/90 p-1 border border-slate-700">
                <button
                  onClick={() => setActiveFocusMode("bus")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeFocusMode === "bus"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Focaliser sur le bus"
                >
                  <Bus className="size-3.5" />
                  <span>Bus</span>
                </button>
                {selectedVillage && (
                  <button
                    onClick={() => setActiveFocusMode("village")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      activeFocusMode === "village"
                        ? "bg-indigo-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title={`Focaliser sur ${selectedVillage.name}`}
                  >
                    <MapPin className="size-3.5" />
                    <span>{selectedVillage.name}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveFocusMode("school")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeFocusMode === "school"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Focaliser sur l'établissement"
                >
                  <Building2 className="size-3.5" />
                  <span>École</span>
                </button>
              </div>

              {/* Speed Widget */}
              <div className="text-center px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Vitesse</p>
                <p className="text-sm font-black text-emerald-400">
                  {selectedTrip?.speedKmh || 0} km/h
                </p>
              </div>

              {/* Distance to School */}
              {distanceBusToSchool != null && (
                <div className="text-center px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Dist. École</p>
                  <p className="text-xs font-bold text-white">
                    {formatDistance(distanceBusToSchool)}
                  </p>
                </div>
              )}

              {/* Call driver */}
              {selectedTrip?.route?.driverPhone && (
                <a
                  href={`tel:${selectedTrip.route.driverPhone}`}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow transition-colors"
                >
                  <Phone className="size-3.5" /> Appeler
                </a>
              )}
            </div>
          </div>

          {/* Active Village Info Pill (if selected) */}
          {selectedVillage && (
            <div className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-900/80 backdrop-blur border border-indigo-500/40 text-xs shadow-lg">
              <MapPin className="size-3.5 text-indigo-400" />
              <span>
                Village / Quartier ciblé : <strong>{selectedVillage.name}</strong> ({selectedVillage.region})
              </span>
              {distanceVillageToSchool != null && (
                <span className="text-indigo-300 font-mono">
                  · à {formatDistance(distanceVillageToSchool)} de l'école
                </span>
              )}
              <button
                onClick={handleClearVillageFilter}
                className="ml-2 hover:text-rose-400"
                title="Supprimer le ciblage"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Embedded OpenStreetMap Radar View ── */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center">
          <iframe
            key={`${mapCoordinates.lat}-${mapCoordinates.lng}-${activeFocusMode}`}
            title="OpenStreetMap Live Radar"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              mapCoordinates.lng - mapCoordinates.zoomDelta
            }%2C${mapCoordinates.lat - mapCoordinates.zoomDelta * 0.75}%2C${
              mapCoordinates.lng + mapCoordinates.zoomDelta
            }%2C${
              mapCoordinates.lat + mapCoordinates.zoomDelta * 0.75
            }&layer=mapnik&marker=${mapCoordinates.lat}%2C${mapCoordinates.lng}`}
            className="w-full h-full filter invert hue-rotate-180 brightness-95 contrast-90"
          />

          {/* Radar Center Coordinate Tag */}
          <div className="absolute bottom-20 right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2 shadow-xl">
            <Compass className="size-3.5 text-indigo-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span>
              {mapCoordinates.label} ({mapCoordinates.lat.toFixed(4)}, {mapCoordinates.lng.toFixed(4)})
            </span>
          </div>

          {/* Radar Scanner Visual Gradient */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        </div>

        {/* ── Bottom Route Progress Timeline ── */}
        {stops.length > 0 && (
          <div className="p-4 bg-slate-900/95 border-t border-slate-800 z-10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-indigo-400" /> Séquence des Arrêts & Itinéraire
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stops.map((st, i) => {
                const isCurrent =
                  selectedTrip?.currentStop?.toLowerCase() === st.stopName.toLowerCase();
                const isNearVillage =
                  selectedVillage &&
                  st.stopName.toLowerCase().includes(selectedVillage.name.toLowerCase());

                return (
                  <div
                    key={st.id || i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 text-xs transition-all ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-md scale-105"
                        : isNearVillage
                        ? "bg-emerald-600/30 text-emerald-200 border-emerald-500/50 shadow"
                        : "bg-slate-800/80 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span className="size-5 rounded-full bg-black/20 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-medium">{st.stopName}</span>
                    {st.timeMorning && (
                      <span className="text-[10px] opacity-75">{st.timeMorning}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
