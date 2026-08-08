"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  onClose: (id: string) => void;
}

export function Toast({ id, title, message, type = "info", onClose }: ToastProps) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const borders = {
    success: "border-emerald-500/30 shadow-[0_4px_12px_rgba(52,211,153,0.15)]",
    error: "border-red-500/30 shadow-[0_4px_12px_rgba(248,113,113,0.15)]",
    warning: "border-amber-500/30 shadow-[0_4px_12px_rgba(251,191,36,0.15)]",
    info: "border-blue-500/30 shadow-[0_4px_12px_rgba(59,130,246,0.15)]",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto flex w-full max-w-md bg-neutral-900/90 backdrop-blur-xl rounded-xl border p-4",
        borders[type]
      )}
    >
      <div className="flex items-start w-full gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
        <div className="flex-1 pt-0.5 min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {message && <p className="mt-1 text-sm text-gray-400">{message}</p>}
        </div>
        <div className="flex-shrink-0 flex">
          <button
            onClick={() => onClose(id)}
            className="rounded-lg p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
