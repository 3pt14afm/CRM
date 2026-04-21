export default function SprfMetaBlock({ dateTime, sprfNo }) {
  return (
    <div className="flex flex-col items-end">
      <p className="text-xs font-medium text-[#111111]">
        {dateTime || '—'}
      </p>

      <p className="mt-1 text-base font-extrabold tracking-[0.01em] text-[#111111]">
        {sprfNo || '—'}
      </p>
    </div>
  );
}