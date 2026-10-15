"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { markAttendanceByAdmission } from "../actions/attendance.actions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, CheckCircle2, XCircle, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface AttendanceScannerProps {
  classId: number;
  subjectId?: number;
  employeeId?: number;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ classId, subjectId, employeeId }) => {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startScanner = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setError(null);
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("reader");
      }

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (decodedText !== lastScanned) {
            setLastScanned(decodedText);
            handleScan(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore frequent errors during scanning
        }
      );
    } catch (err: any) {
      console.error("Camera Access Error:", err);
      let friendlyMessage = "Vérifiez les permissions de votre navigateur.";
      
      if (err.name === "NotAllowedError" || err.message?.includes("Permission dismissed")) {
        friendlyMessage = "L'accès à la caméra est bloqué. Veuillez cliquer sur l'icône de cadenas dans la barre d'adresse pour autoriser la caméra.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        friendlyMessage = "Aucune caméra n'a été trouvée sur cet appareil.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        friendlyMessage = "La caméra est déjà utilisée par une autre application.";
      } else if (err.name === "SecurityError") {
        friendlyMessage = "Le protocole HTTPS est requis pour accéder à la caméra.";
      }

      setError(friendlyMessage);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Scanner might already be stopped
        console.warn("Scanner stop warning:", err);
      }
    }
    setIsScanning(false);
  };

  const handleScan = async (numAdmission: string) => {
    const result = (await markAttendanceByAdmission(numAdmission, classId, subjectId, employeeId)) as any;
    
    if (result?.success || result?.data?.success) {
      toast.success(result.message || result.data?.message, {
        description: `Admission: ${numAdmission}`,
        icon: <CheckCircle2 className="text-green-500" />,
      });
      setStudentInfo(result.student || result.data?.student);
      setError(null);
      
      // Play success sound
      const audio = new Audio("/sounds/success.mp3");
      audio.play().catch(() => {}); // Ignore if audio fails
    } else {
      toast.error(result?.error || "Une erreur est survenue", {
        icon: <XCircle className="text-red-500" />,
      });
      setError(result?.error || "Erreur de scan");
      setStudentInfo(null);
      
      const audio = new Audio("/sounds/error.mp3");
      audio.play().catch(() => {});
    }

    // Reset last scanned after 2 seconds to allow re-scanning if needed
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setLastScanned(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card className="overflow-hidden border-2 border-primary/20 shadow-2xl">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="flex items-center gap-2">
            <Camera className="text-primary" />
            Scanner de Présence
          </CardTitle>
          <CardDescription>
            Scannez le code QR de la carte d'étudiant pour marquer la présence.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            <div id="reader" className="w-full h-full"></div>
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white p-6 text-center">
                <Camera size={64} className="mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Caméra Prête</h3>
                <p className="text-sm text-slate-400 mb-6 max-w-sm">
                  Activez la caméra pour commencer à scanner les codes QR des étudiants.
                </p>
                <Button onClick={startScanner} size="lg" className="gap-2">
                  <Camera size={18} />
                  Démarrer le Scanner
                </Button>
              </div>
            )}

            {isScanning && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="absolute bottom-4 right-4 z-10"
                onClick={stopScanner}
              >
                Arrêter
              </Button>
            )}
            
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg flex items-center gap-2 z-20">
                <XCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {studentInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="border-green-500/30 bg-green-500/5 overflow-hidden">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-600">
                  {studentInfo.photoPath ? (
                    <img src={studentInfo.photoPath} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-white">{studentInfo.nomEtudiant}</h4>
                  <p className="text-sm text-slate-500">{studentInfo.classe} - {studentInfo.numAdmission}</p>
                </div>
                <div className="flex flex-col items-end">
                  <Badge className="bg-green-600">PRÉSENT</Badge>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
