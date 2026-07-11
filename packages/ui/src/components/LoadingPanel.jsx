import React from 'react';
import { Hourglass } from 'lucide-react';

const LoadingPanel = ({ text }) => {
  return (
    <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-md">
       <div className="w-full max-w-md space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24">
             <div className="absolute inset-0 border-4 border-amber-600/30 rounded-full animate-ping"></div>
             <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Hourglass className="w-8 h-8 text-amber-500" />
             </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-amber-500 mb-2 font-serif tracking-widest animate-pulse">
               {text || "MENGHUBUNGKAN LINTASAN WAKTU..."}
            </h3>
            <p className="text-stone-400 text-sm font-mono">Memproses data historis & membangun simulasi...</p>
          </div>
          <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden relative border border-stone-700">
             {/* UPDATE: Warna gradient diubah menjadi coklat ke oranye */}
             <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-700 via-orange-600 to-amber-500 animate-progress-loading w-full origin-left"></div>
          </div>
       </div>
    </div>
  );
};

export { LoadingPanel };
