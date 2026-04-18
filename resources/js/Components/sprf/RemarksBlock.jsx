export default function RemarksBlock({ value, onChange }) {
  return (
    <div className="rounded-xl border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 bg-[#FBFFFA] px-7 py-3 shadow-md">
      <div className="grid grid-cols-[145px_minmax(0,1fr)] items-center gap-5">
        <label className="text-xs uppercase font-bold tracking-[0.01em]">
          Justification /
          <br />
          Remarks
        </label>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="min-h-[30px] rounded-xl border border-gray-200 px-3 py-3 text-xs outline-none placeholder:text-[#9AA08F] hover:border-[#28980080] focus:border-[#289800] focus:outline-none focus:ring-0 resize-none"
        />
      </div>
    </div>
  );
}