export default function NamesBlock({ signers, onUpdateSigner }) {
  const signer0 = signers?.[0] ?? { name: '', position: '' };
  const signer1 = signers?.[1] ?? { name: '', position: '' };
  const signer2 = signers?.[2] ?? { name: '', position: '' };
  const signer3 = signers?.[3] ?? { name: '', position: '' };

  return (
    <div className="w-full mt-10 pb-10">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="grid grid-cols-1 gap-y-12 gap-x-24 md:grid-cols-2">
          <div className="flex flex-col space-y-12">
            <SectionLabel label="PREPARED BY:" />

            <Signatory
              name={signer0.name}
              title={signer0.position}
              onNameChange={(value) => onUpdateSigner(0, 'name', value)}
              onTitleChange={(value) => onUpdateSigner(0, 'position', value)}
            />

            <Signatory
              name={signer1.name}
              title={signer1.position}
              onNameChange={(value) => onUpdateSigner(1, 'name', value)}
              onTitleChange={(value) => onUpdateSigner(1, 'position', value)}
            />
          </div>

          <div className="flex flex-col space-y-12">
            <SectionLabel label="APPROVED BY:" />

            <Signatory
              name={signer2.name}
              title={signer2.position}
              onNameChange={(value) => onUpdateSigner(2, 'name', value)}
              onTitleChange={(value) => onUpdateSigner(2, 'position', value)}
            />

            <Signatory
              name={signer3.name}
              title={signer3.position}
              onNameChange={(value) => onUpdateSigner(3, 'name', value)}
              onTitleChange={(value) => onUpdateSigner(3, 'position', value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <span className="text-[10px] font-extrabold text-gray-800 tracking-tight print:font-semibold">
      {label}
    </span>
  );
}

function Signatory({ name, title, onNameChange, onTitleChange }) {
  return (
    <div className="flex flex-col space-y-4 justify-center">
      <div className="pt-2">
        <input
          type="text"
          value={name || ''}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="—"
          className="text-sm font-semibold text-gray-900 border-0 border-b border-gray-400 inline-block w-full pb-0.5 bg-transparent outline-none print:font-medium print:text-xs"
        />

        <input
          type="text"
          value={title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder=""
          className="text-[11px] text-gray-500 mt-1 w-full bg-transparent border-0 outline-none"
        />
      </div>
    </div>
  );
}