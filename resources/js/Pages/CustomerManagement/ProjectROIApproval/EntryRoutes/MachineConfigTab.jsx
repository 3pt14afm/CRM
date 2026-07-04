import React from 'react';

import Cost from '@/Components/roi/Entry/MachineConfiguration/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfiguration/MachineConfig';
import InterestCalculator from '@/Components/roi/Entry/MachineConfiguration/InterestCalcu';
import CompanyInfo from '@/Components/roi/Entry/MachineConfiguration/CompanyInfo';
import Yields from '@/Components/roi/Entry/MachineConfiguration/Yields';
import Fees from '@/Components/roi/Entry/MachineConfiguration/Fees';
import EntryRemarks from '@/Components/roi/Entry/EntryRemarks';

function MachineConfigTab({
  buttonClicked,
  readOnly,
  showCompanyInfoErrors = false,
  showOutrightErrors = false,
  showModeErrors = false,
}) {
  return (
    <div className='mx-5 bg-[#f8f8f8] border rounded-r-lg rounded-b-xl border-b-[#2c2c2e]/30 border-t-[#2c2c2e]/10 border-[#2c2c2e]/20 shadow-md print:shadow-none print:border-0'>
      <div className='flex flex-col   items-center w-full lg:px-10 px-5 pt-5 gap-5 mb-5 md:flex-col lg:flex-row'>
        <CompanyInfo
          buttonClicked={buttonClicked}
          readOnly={readOnly}
          showErrors={showCompanyInfoErrors}
          className="lg:-w[60%]"
        />

        <div className='lg:w-[40%] flex flex-col mt-3 gap-5 items-start justify-start md:mt-0 md:flex-row lg:flex-col'>
          <InterestCalculator buttonClicked={buttonClicked} readOnly={readOnly} />
          <Yields buttonClicked={buttonClicked} readOnly={readOnly} />
        </div>
      </div>

      <MachineConfig
        buttonClicked={buttonClicked}
        readOnly={readOnly}
        showOutrightErrors={showOutrightErrors}
        showModeErrors={showModeErrors}
      />

      <div className='grid lg:grid-cols-[70%_1fr] w-full gap-3 xl:gap-5 px-2 lg:px-10 items-start pt-5 mb-9'>
        <Fees buttonClicked={buttonClicked} readOnly={readOnly}/>
        <EntryRemarks readOnly={readOnly}/>
      </div>
    </div>
  );
}

export default MachineConfigTab;