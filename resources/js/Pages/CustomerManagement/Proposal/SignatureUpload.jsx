import { ImagePlus } from "lucide-react";
import { useRef } from "react";

export default function SignatureUpload({ image, onUpload }) {
  const ref = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onUpload(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const file = Array.from(e.clipboardData.items)
      .find(item => item.type.startsWith('image/'))?.getAsFile();
    if (file) handleFile(file);
  };

  return (
    <>
      <div
        onPaste={handlePaste}
        tabIndex={0}
        onClick={() => ref.current?.click()}
        className="relative w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
      >
        {image ? (
          <div className="relative group">
            <img src={image} alt="Signature" className="w-full h-24 object-contain rounded-xl p-2" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <p className="text-white text-[11px] font-bold">Click or paste to replace</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <ImagePlus size={20} className="text-slate-300" />
            <p className="text-[11px] font-semibold text-slate-400">Click to browse or paste</p>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </>
  );
}