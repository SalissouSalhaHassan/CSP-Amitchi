"use client";
import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getBranchByLevel } from "../../settings/actions/settings.actions";

interface Student {
  id: number;
  numAdmission: string;
  nomEtudiant: string;
  nomArabe?: string | null;
  classe?: string | null;
  section?: string | null;
  photoPath?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  sexe?: string | null;
  educationalLevel?: string | null;
  nationalite?: string | null;
}

interface StudentCardProps {
  student: Student;
  schoolName?: string;
  schoolCountry?: string;
  academicYear?: string;
  side?: "recto" | "verso";
  themeColor?: string;
  bgGradient?: string;
  cornerRadius?: number;
  shadowIntensity?: number;
  fontFamily?: string;
}

const B = "#7A0019";
const BD = "#5C0013";
const EM = "#0B3D25";
const GOLD = "#C8922A";
const GL = "#F0C060";
const W = "#FFFFFF";
const GR = "#64748B";
const DK = "#1E293B";

const F = (label: string, value: string, icon: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
    <span style={{ fontSize: 12, width: 16, textAlign: "center", flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 7, fontWeight: 800, color: GR, textTransform: "uppercase", letterSpacing: 0.4, width: 96, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 9, fontWeight: 800, color: DK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value || "—"}</span>
  </div>
);

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  schoolName: propSchoolName,
  schoolCountry = "RÉPUBLIQUE DU NIGER",
  academicYear = "2024-2025",
  side = "recto",
}) => {
  const [branchInfo, setBranchInfo] = useState<any>(null);

  useEffect(() => {
    if (student.educationalLevel) {
      getBranchByLevel(student.educationalLevel).then(res => {
        if (res.data) setBranchInfo(res.data);
      });
    }
  }, [student.educationalLevel]);

  const schoolName = branchInfo?.branchName || propSchoolName || "UNIVERSITÉ ABOUBACAR IBRAHIM";
  const contactNo = branchInfo?.contactNo || "+227 20 72 35 35";
  const website = branchInfo?.branchAlias || "www.uabi.ne"; // Using branchAlias for website as fallback
  const logoPath = branchInfo?.logoPath;

  const isProvisoire = !student.id || String(student.id).includes("local-") || Number(student.id) < 0 || (typeof navigator !== "undefined" && !navigator.onLine);

  const qr = JSON.stringify({
    type: "student_pass",
    student_id: student.id,
    id: student.id,
    num_admission: student.numAdmission,
    num: student.numAdmission,
    nom_etudiant: student.nomEtudiant,
    nom: student.nomEtudiant,
    classe: student.classe || "",
  });
  const issued = new Date().toLocaleDateString("fr-FR");
  const expiry = `31/10/${parseInt(academicYear.split("-")[1] || "2025")}`;

  const hasPhoto = Boolean(student.photoPath) &&
    typeof student.photoPath === "string" &&
    student.photoPath.trim().length > 0 &&
    !student.photoPath.toLowerCase().includes("placeholder");

  const photo = hasPhoto
    ? student.photoPath!.startsWith("http") ? student.photoPath!
      : `/api/files?path=${encodeURIComponent(student.photoPath!)}`
    : null;
  const classe = student.classe
    ? `Classe de ${student.classe}${student.section ? ` – ${student.section}` : ""}` : "ÉTUDIANT RÉGULIER";

  const eduLevel = (student.educationalLevel || "Lycée").toUpperCase();

  /* ══════ VERSO ══════ */
  if (side === "verso") {
    return (
      <div style={{ width: 680, height: 430, borderRadius: 24, overflow: "hidden", boxSizing: "border-box", position: "relative", fontFamily: "Arial,sans-serif", background: W, border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        {/* cream bg */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#fafafa,#f1f5f9)", zIndex: 0 }} />
        {/* building watermark */}
        <div style={{ position: "absolute", bottom: 56, right: 0, width: 320, height: 200, zIndex: 1, opacity: 0.07, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'%3E%3Crect x='100' y='50' width='200' height='180' fill='%23333'/%3E%3Crect x='60' y='90' width='280' height='140' fill='%23333'/%3E%3Crect x='170' y='10' width='60' height='50' fill='%23333'/%3E%3Crect x='186' y='0' width='8' height='18' fill='%23333'/%3E%3Crect x='130' y='155' width='35' height='75' fill='%23fff'/%3E%3Crect x='235' y='155' width='35' height='75' fill='%23fff'/%3E%3Crect x='183' y='155' width='34' height='48' fill='%23fff'/%3E%3C/svg%3E")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "bottom right" }} />
        {/* wave above footer */}
        <svg viewBox="0 0 680 38" preserveAspectRatio="none" style={{ position: "absolute", bottom: 56, left: 0, width: "100%", height: 38, zIndex: 2 }}>
          <path d="M0,18 C120,38 260,0 340,18 C440,38 560,0 680,18 L680,38 L0,38 Z" fill={EM} />
        </svg>
        {/* content */}
        <div style={{ position: "relative", zIndex: 3, display: "flex", height: "calc(100% - 56px)", padding: "26px 30px 16px 30px", gap: 26 }}>
          {/* left: logo + rules */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 62, height: 62, borderRadius: 14, background: "linear-gradient(135deg,#FFF3D6,#fff)", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(200,146,42,0.2)" }}>
                {logoPath ? (
                  <img src={logoPath} alt="Logo" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 28 }}>🛡️</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: B, textTransform: "uppercase", letterSpacing: 2 }}>RÈGLEMENT INTÉRIEUR</div>
                <div style={{ width: 90, height: 2, background: `linear-gradient(90deg,${GOLD},transparent)`, marginTop: 5 }} />
              </div>
            </div>
            {["Cette carte est strictement personnelle et non cessible.",
              "Elle doit être présentée à toute réquisition des autorités compétentes.",
              "En cas de perte, informer immédiatement l'administration.",
              "L'usage frauduleux expose à des sanctions disciplinaires sévères.",
              "La carte reste la propriété de l'établissement."].map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 9, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: B, color: W, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <span style={{ fontSize: 10, color: DK, fontWeight: 600, lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
          {/* right: QR */}
          <div style={{ width: 164, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingLeft: 22, borderLeft: "1px solid #e2e8f0" }}>
            <div style={{ padding: 12, background: W, borderRadius: 18, border: "1.5px solid #e2e8f0", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}>
              <QRCodeSVG value={qr} size={112} level="H" />
            </div>
            <div style={{ fontSize: 7, fontWeight: 900, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center" }}>🔒{"\n"}DOCUMENT SÉCURISÉ</div>
            <div style={{ background: "#FFF3D6", borderRadius: 12, padding: "8px 14px", border: `1px solid ${GOLD}`, textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: 7.5, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: 1 }}>Valide jusqu'au</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: B, marginTop: 2 }}>{expiry}</div>
            </div>
          </div>
        </div>
        {/* footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 56, background: EM, zIndex: 4, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between" }}>
          {[["📞", contactNo], ["🔒", "Carte sécurisée – Édut Studio"], ["🌐", website]].map(([ic, txt]) => (
            <div key={txt} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14 }}>{ic}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: W }}>{txt}</span>
            </div>
          ))}
        </div>
        {isProvisoire && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 99, transform: "rotate(-25deg)", opacity: 0.12 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#EF4444", border: "5px solid #EF4444", padding: "10px 28px", borderRadius: 16, letterSpacing: 4, textTransform: "uppercase" }}>
              CARTE PROVISOIRE
            </span>
          </div>
        )}
      </div>
    );
  }

  /* ══════ RECTO ══════ */
  return (
    <div style={{ width: 680, height: 460, borderRadius: 24, overflow: "hidden", boxSizing: "border-box", position: "relative", fontFamily: "Arial,sans-serif", background: W, border: "1px solid #2d0a0a", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>

      {/* ══ BURGUNDY HEADER ══ */}
      <div style={{ height: 162, flexShrink: 0, position: "relative", background: `linear-gradient(135deg, ${BD} 0%, ${B} 55%, #9A1030 100%)`, padding: "18px 22px 0 22px" }}>

        {/* Cross pattern */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Crect x='14' y='4' width='4' height='24'/%3E%3Crect x='4' y='14' width='24' height='4'/%3E%3C/g%3E%3C/svg%3E")` }} />

        {/* Dots top-right */}
        <div style={{ position: "absolute", top: 16, right: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, zIndex: 3, opacity: 0.5 }}>
          {Array.from({ length: 9 }).map((_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: GL }} />)}
        </div>

        {/* Building silhouette right side */}
        <div style={{ position: "absolute", bottom: 0, right: 60, width: 220, height: 110, zIndex: 2, opacity: 0.12, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 140'%3E%3Crect x='60' y='30' width='180' height='110' fill='%23fff'/%3E%3Crect x='30' y='60' width='240' height='80' fill='%23fff'/%3E%3Crect x='120' y='5' width='60' height='32' fill='%23fff'/%3E%3Crect x='146' y='0' width='8' height='12' fill='%23fff'/%3E%3Crect x='80' y='90' width='32' height='50' fill='%23000' opacity='0.4'/%3E%3Crect x='188' y='90' width='32' height='50' fill='%23000' opacity='0.4'/%3E%3Crect x='134' y='90' width='32' height='35' fill='%23000' opacity='0.4'/%3E%3C/svg%3E")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "bottom right" }} />

        {/* Diagonal stripe */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "32%", background: "rgba(0,0,0,0.09)", transform: "skewX(-16deg)", transformOrigin: "top right", zIndex: 2 }} />

        {/* Logo + School */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 5 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 66, height: 66, background: "rgba(255,255,255,0.96)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(0,0,0,0.22)", flexShrink: 0, border: "1px solid rgba(255,255,255,0.3)" }}>
              <div style={{ width: 52, height: 52, borderRadius: 11, border: `2.5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,#FFF3D6,${W})` }}>
                {logoPath ? (
                  <img src={logoPath} alt="Logo" style={{ width: "85%", height: "85%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 26 }}>🎓</span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.72)", textTransform: "uppercase", letterSpacing: 2.5 }}>{schoolCountry}</div>
              <div style={{ fontSize: 19, fontWeight: 900, color: W, letterSpacing: 0.3, lineHeight: 1.1, marginTop: 3, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>{schoolName}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: GL, marginTop: 5, fontStyle: "italic" }}>Année Scolaire {academicYear}</div>
            </div>
          </div>
          {/* ÉTUDIANT badge */}
          <div style={{ marginTop: 8, background: EM, padding: "9px 20px", borderRadius: 24, border: "1.5px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>🎓</span>
            <span style={{ fontSize: 11, fontWeight: 900, color: W, letterSpacing: 2, textTransform: "uppercase" }}>{eduLevel.includes("UNIVERSITÉ") ? "ÉTUDIANT" : "ÉLÈVE"}</span>
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 680 38" preserveAspectRatio="none" style={{ position: "absolute", bottom: -1, left: 0, width: "100%", height: 38, display: "block", zIndex: 6 }}>
          <path d="M0,0 C170,42 340,42 510,10 C580,0 640,20 680,10 L680,38 L0,38 Z" fill={W} />
        </svg>
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{ flex: 1, display: "flex", padding: "0 20px 0 0", position: "relative" }}>

        {/* Photo — overlaps header by 10px */}
        <div style={{ width: 150, flexShrink: 0, position: "relative", marginTop: -10, marginLeft: 20, zIndex: 10 }}>
          <div style={{ width: 142, height: 175, borderRadius: 18, background: "#f1f5f9", border: `3.5px solid ${W}`, boxShadow: "0 8px 28px rgba(0,0,0,0.14)", overflow: "hidden" }}>
            {photo ? (
              <img
                src={photo}
                alt={student.nomEtudiant}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-avatar");
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
              />
            ) : null}
            <div
              className="fallback-avatar"
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg,#f1f5f9,#e2e8f0)",
                display: photo ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 50, opacity: 0.3 }}>👤</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: GR, textTransform: "uppercase", letterSpacing: 1 }}>
                Photo Non Fournie
              </span>
            </div>
          </div>
          {/* Holographic seal */}
          <div style={{ position: "absolute", bottom: 6, left: 6, width: 50, height: 50, borderRadius: "50%", background: `conic-gradient(${GOLD},${GL},#a87c1a,${GL},${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(200,146,42,0.5)", border: `2px solid ${W}` }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏛</div>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, paddingTop: 8, paddingLeft: 16, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Name */}
          <div style={{ fontSize: 20, fontWeight: 900, color: DK, textTransform: "uppercase", lineHeight: 1.15, letterSpacing: 0.3, wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden" }}>{student.nomEtudiant}</div>
          {student.nomArabe && <div style={{ fontSize: 13, fontWeight: 700, color: GR, marginTop: 3, direction: "rtl", textAlign: "left" }}>{student.nomArabe}</div>}

          {/* Class badge - gold gradient filled (matches reference) */}
          <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "5px 18px", borderRadius: 20, marginTop: 8, marginBottom: 10, background: `linear-gradient(135deg, ${GOLD}, ${GL})`, boxShadow: "0 2px 8px rgba(200,146,42,0.3)" }}>
            <span style={{ fontSize: 9.5, fontWeight: 900, color: W, textTransform: "uppercase", letterSpacing: 1.2 }}>{classe}</span>
          </div>

          {/* Data grid + QR */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              {F("ID Élève", student.numAdmission, "🪪")}
              {F("Date de Naissance", student.dateNaissance || "—", "📅")}
              {F("Lieu de Naissance", student.lieuNaissance || "—", "📍")}
              {F("Nationalité", student.nationalite || "Nigérienne", "🏳")}
              {F("Niveau Educatif", eduLevel, "🎓")}
            </div>
            <div style={{ flex: 1 }}>
              {F("Sexe", student.sexe || "—", "⚥")}
              {F("Niveau", student.educationalLevel || "—", "📊")}
              {F("Série", student.section || "—", "📚")}
              {F("Groupe", student.classe || "—", "👥")}
              {F("Date d'Émission", issued, "📋")}
            </div>
            {/* QR */}
            <div style={{ width: 108, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingBottom: 4 }}>
              <div style={{ padding: 7, background: W, borderRadius: 12, border: "1.5px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                <QRCodeSVG value={qr} size={82} level="H" />
              </div>
              <span style={{ fontSize: 6.5, fontWeight: 900, color: GR, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center", lineHeight: 1.3 }}>SCANNEZ POUR{"\n"}VÉRIFIER</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ GOLD WAVE DIVIDER ══ */}
      <div style={{ height: 8, flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <svg viewBox="0 0 680 8" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
          <defs><linearGradient id="gld" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0B3D25" /><stop offset="20%" stopColor="#C8922A" /><stop offset="50%" stopColor="#F0C060" /><stop offset="80%" stopColor="#C8922A" /><stop offset="100%" stopColor="#0B3D25" /></linearGradient></defs>
          <path d="M0,4 C120,0 200,8 340,4 C480,0 560,8 680,4 L680,8 L0,8 Z" fill="url(#gld)" />
        </svg>
      </div>

      {/* ══ FOOTER ══ */}
      <div style={{ height: 54, background: EM, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 22px", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Brush Script MT',cursive", fontSize: 20, color: W, fontStyle: "italic" }}>Dr. Amujat</div>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: GL }}>Le Recteur</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 13 }}>🔒</span></div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 600, fontStyle: "italic", maxWidth: 220, lineHeight: 1.4 }}>Cette carte est strictement personnelle<br/>et doit être présentée sur demande.</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}><span style={{ fontSize: 13 }}>📞</span><span style={{ fontSize: 10.5, fontWeight: 800, color: W }}>{contactNo}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 3 }}><span style={{ fontSize: 13 }}>🌐</span><span style={{ fontSize: 10.5, fontWeight: 800, color: W }}>{website}</span></div>
        </div>
      </div>
      {isProvisoire && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 99, transform: "rotate(-25deg)", opacity: 0.12 }}>
          <span style={{ fontSize: 48, fontWeight: 900, color: "#EF4444", border: "5px solid #EF4444", padding: "10px 28px", borderRadius: 16, letterSpacing: 4, textTransform: "uppercase" }}>
            CARTE PROVISOIRE
          </span>
        </div>
      )}
    </div>
  );
};
