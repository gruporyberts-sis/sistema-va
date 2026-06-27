"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => {
            console.log("Service Worker registrado correctamente");
          })
          .catch((error) => {
            console.error("Error registrando Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}