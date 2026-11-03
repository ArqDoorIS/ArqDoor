import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('arqdoor_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('arqdoor_cookie_consent', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    // Para recusa, podemos salvar 'false' ou apenas fechar e perguntar novamente na próxima sessão.
    // Como são cookies essenciais, o aviso é mais informativo.
    localStorage.setItem('arqdoor_cookie_consent', 'false');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-2xl md:p-6"
        >
          <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">Este site utiliza cookies 🍪</h3>
              <p className="text-sm text-muted-foreground">
                Utilizamos cookies essenciais para garantir que você tenha a melhor experiência de autenticação e segurança.
                As informações coletadas incluem: dados de sessão (token) e preferências de navegação.
                Não utilizamos cookies de rastreamento de terceiros sem seu consentimento explícito.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button variant="outline" onClick={handleDecline}>
                Recusar
              </Button>
              <Button onClick={handleAccept}>
                Aceitar e Continuar
              </Button>
              <button 
                onClick={() => setIsVisible(false)} 
                className="absolute top-2 right-2 md:static md:hidden text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
