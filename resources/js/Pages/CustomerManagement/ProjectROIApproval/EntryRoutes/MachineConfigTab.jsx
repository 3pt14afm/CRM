import React from 'react';

import Cost from '@/Components/roi/Entry/MachineConfiguration/Cost';
import MachineConfig from '@/Components/roi/Entry/MachineConfiguration/MachineConfig';
import InterestCalculator from '@/Components/roi/Entry/MachineConfiguration/InterestCalcu';
import CompanyInfo from '@/Components/roi/Entry/MachineConfiguration/CompanyInfo';
import Yields from '@/Components/roi/Entry/MachineConfiguration/Yields';
import Fees from '@/Components/roi/Entry/MachineConfiguration/Fees';

function MachineConfigTab({ buttonClicked, readOnly, showCompanyInfoErrors = false }) {
  return (
    <div className='mx-5 bg-lightgreen/5 border rounded-r-lg rounded-b-xl border-t-0 border-b-[#B5EBA2]/80 border-x-[#B5EBA2]/80'>
      {/* COMPANY INFO + INTEREST */}
      <div className='flex items-center px-10 pt-5 gap-5 mb-5 md:flex-col lg:flex-row'>
        <CompanyInfo
          buttonClicked={buttonClicked}
          readOnly={readOnly}
          showErrors={showCompanyInfoErrors}
        />

        <div className='flex flex-col mt-3 gap-5 items-start justify-start md:mt-0 md:flex-row lg:flex-col'>
          <InterestCalculator buttonClicked={buttonClicked} readOnly={readOnly} />
          <Yields buttonClicked={buttonClicked} readOnly={readOnly} />
        </div>
      </div>

      <MachineConfig buttonClicked={buttonClicked} readOnly={readOnly} />

      {/* FEES */}
      <div className='grid grid-cols-[75%_25%] mx-7 items-center pt-5 mb-9'>
        <Fees buttonClicked={buttonClicked} readOnly={readOnly} />
      </div>
    </div>
  );
}

export default MachineConfigTab;