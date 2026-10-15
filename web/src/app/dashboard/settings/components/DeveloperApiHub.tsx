"use client";

import React, { useState } from "react";
import {
  Code2,
  Key,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Lock,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function DeveloperApiHub({ schoolSlug }: { schoolSlug?: string }) {
  const [apiKey, setApiKey] = useState("edut_live_sec_" + (schoolSlug || "school") + "_8f92a10c7e84");
  const [copied, setCopied] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [samlEntityId, setSamlEntityId] = useState(`https://${schoolSlug || "ecole"}.edut.pro/api/auth/sso/saml`);
  const [oauthCallback, setOauthCallback] = useState(`https://${schoolSlug || "ecole"}.edut.pro/api/auth/callback`);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = () => {
    const newKey = "edut_live_sec_" + (schoolSlug || "school") + "_" + Math.random().toString(36).substring(2, 14);
    setApiKey(newKey);
    toast.success("Nouvelle clé API générée avec succès.");
  };

  return (
    <div className="bg-white dark:bg-[#12131C] p-8 sm:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <Code2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                API Développeur & Authentification SSO
              </h3>
              <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase">
                Enterprise
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Intégrez EDUT avec vos systèmes d'information, ERP existants et fournisseurs d'identité (SAML / OAuth2).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: API KEYS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Key size={16} className="text-indigo-500" />
              Clé d'Accès API REST (Live Secret Key)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Utilisez cette clé dans l'en-tête <code className="text-indigo-600 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;TOKEN&gt;</code> pour interroger l'API.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateKey}
            className="rounded-xl font-bold text-xs gap-1.5 dark:border-slate-700"
          >
            <RefreshCw size={13} />
            Régénérer
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={apiKey}
            className="font-mono text-xs h-12 bg-slate-50 dark:bg-[#0E0F18] border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold"
          />
          <Button
            variant="secondary"
            onClick={() => handleCopy(apiKey)}
            className="h-12 px-4 rounded-xl font-bold text-xs gap-1.5 shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Copié" : "Copier"}
          </Button>
        </div>
      </div>

      {/* SECTION 2: SSO SAML 2.0 / OAuth2 */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              Authentification Unique SSO (SAML 2.0 / OAuth2 / Google Workspace / Azure AD)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Permet aux enseignants, élèves et staff de se connecter avec leurs identifiants institutionnels centralisés.
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-black uppercase">
            Actif
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SAML Entity ID (SP Metadata URL)</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={samlEntityId}
                className="font-mono text-xs h-11 bg-slate-50 dark:bg-[#0E0F18] border-slate-200 dark:border-slate-800 rounded-xl"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(samlEntityId)}
                className="h-11 px-3 rounded-xl"
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OAuth2 Redirect / ACS Callback URL</label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={oauthCallback}
                className="font-mono text-xs h-11 bg-slate-50 dark:bg-[#0E0F18] border-slate-200 dark:border-slate-800 rounded-xl"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(oauthCallback)}
                className="h-11 px-3 rounded-xl"
              >
                <Copy size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
