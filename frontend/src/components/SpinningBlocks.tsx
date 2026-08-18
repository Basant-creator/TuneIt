import React from 'react';
import { motion } from 'framer-motion';

export const SpinningBlocks = () => {
  return (
    <div className="flex items-center justify-center w-16 h-16 gpu-layer">
      <motion.div
        className="grid grid-cols-2 gap-1 w-8 h-8 gpu-layer"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
      >
        <motion.div 
          className="bg-brand-pink rounded-sm"
          animate={{ scale: [1, 0.5, 1], borderRadius: ["2px", "6px", "2px"] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
        />
        <motion.div 
          className="bg-brand-blue rounded-sm"
          animate={{ scale: [1, 0.5, 1], borderRadius: ["2px", "6px", "2px"] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
        />
        <motion.div 
          className="bg-brand-yellow rounded-sm"
          animate={{ scale: [1, 0.5, 1], borderRadius: ["2px", "6px", "2px"] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.6 }}
        />
        <motion.div 
          className="bg-brand-orange rounded-sm"
          animate={{ scale: [1, 0.5, 1], borderRadius: ["2px", "6px", "2px"] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}
        />
      </motion.div>
    </div>
  );
};
