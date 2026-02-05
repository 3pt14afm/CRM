import React from 'react';
import { IoIosAddCircle } from "react-icons/io";

function AddNotes() {
  return (
    /* max-w-7xl for wide width; mx-auto keeps it centered */
    <div className="w-full mx-auto mb-6 px-4">
      <div className="flex items-center bg-white border h-28 border-gray-200 rounded-2xl py-2 px-6 shadow-[0px_2px_8px_rgba(0,0,0,0.05)]">
        
        {/* Input: text-sm and py-1 keeps the height small */}
        <input
          type="text"
          placeholder="Write your notes here....."
          className="flex-grow bg-transparent border-none focus:ring-0 text-gray-400 placeholder-gray-400 text-sm py-1"
        />

        {/* Button: Smaller vertical padding (py-1.5) to maintain the slim profile */}
        <button className="flex items-center gap-2 bg-[#2DA300] hover:bg-[#268a00] text-white px-5 mt-8 py-3 rounded-full font-semibold text-xs transition-all shadow-[0px_4px_10px_rgba(45,163,0,0.3)] shrink-0 my-1">
          <span className="flex items-center justify-center w-3.5 h-3.5 text-[30px] leading-none">
            <IoIosAddCircle />
          </span>
          Add Notes
        </button>
      </div>
    </div>
  );
}

export default AddNotes;