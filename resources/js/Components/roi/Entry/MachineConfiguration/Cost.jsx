import React from 'react'

function Cost() {
  return (
   <div class="flex items-center justify-center">
  <div class="bg-[#59A846] rounded-[2rem] p-10 shadow-lg inline-block text-white font-sans">
    
    <h2 class="text-base font-bold tracking-tight mb-1 opacity-95">
      TOTAL PROJECT COST
    </h2>

    <div class="flex items-baseline gap-2 mb-4">
      <span class="text-3xl font-bold tracking-tighter">
        999,999,999.99
      </span>
      <span class="text-3xl font-bold">
        PHP
      </span>
    </div>

    <div class="inline-flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-3 py-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-xs font-medium">
        Includes all monthly rentals and one-time fees
      </span>
    </div>

  </div>
</div>
  )
}

export default Cost