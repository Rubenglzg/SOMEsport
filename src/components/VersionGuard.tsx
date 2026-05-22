import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { getAppConfig, isVersionOlder, APP_VERSION } from '../lib/versionService';
import type { AppConfig } from '../lib/versionService';

export const VersionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkVersion = async () => {
      const remoteConfig = await getAppConfig();
      if (remoteConfig) {
        setConfig(remoteConfig);
        if (isVersionOlder(APP_VERSION, remoteConfig.minVersion)) {
          setNeedsUpdate(true);
        }
      }
      setIsLoading(false);
    };

    checkVersion();
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9999]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {needsUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-[9999] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[32px] p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-amber-500" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">
                Actualización Obligatoria
              </h2>
              
              <p className="text-slate-400 mb-8 leading-relaxed">
                Estás usando la versión <span className="text-white font-mono">{APP_VERSION}</span>. 
                Para garantizar la seguridad y el correcto funcionamiento, es necesario actualizar a la versión <span className="text-white font-mono">{config?.minVersion}</span>.
              </p>

              <div className="space-y-4">
                <a
                  href={config?.downloadUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-5 h-5" /> Descargar nueva versión
                </a>
                
                <p className="text-xs text-slate-500">
                  Tus datos están seguros. La actualización solo toma un momento.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Solo renderizamos los hijos si NO hay una actualización obligatoria bloqueando */}
      {!needsUpdate && children}
    </>
  );
};
