export default function SprfMetaBlock({ dateTime, sprfNo }) {
  return (
    <div className="flex flex-col items-end">
      <p className="text-[10px] xl:text-xs sm:font-medium">
        {dateTime || '—'}
      </p>

      <p className="text-xs xl:text-base font-bold sm:font-extrabold tracking-[0.01em] text-[#111111]">
        {sprfNo || '—'}
      </p>
    </div>
  );
}