export default function CompanyInfoBlock({ value, onChange }) {
  const handleFieldChange = (field, fieldValue) => {
    onChange((prev) => ({
      ...prev,
      [field]: fieldValue,
    }));
  };

  const fields = [
    {
      key: 'subCategory',
      label: 'SUB CATEGORY',
      placeholder: 'Enter Sub Category',
    },
    {
      key: 'account',
      label: 'ACCOUNT',
      placeholder: 'Enter Complete Company Name',
    },
    {
      key: 'accountManager',
      label: 'ACCOUNT MANAGER',
      placeholder: 'Enter Complete AM Name',
    },
  ];

  return (
    <div className="border-[#D6DDD0] bg-[#FBFFFA] px-7 py-4 shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl">
      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className="grid grid-cols-[190px_minmax(0,1fr)] items-center"
          >
            <label className="text-xs font-bold tracking-[0.01em]">
              {field.label}
            </label>

            <input
              type="text"
              value={value[field.key] ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="h-10 rounded-xl border px-3 text-sm outline-none border-gray-200 focus:border-[#289800] focus:outline-none focus:ring-0 placeholder:text-[#9AA08F]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}