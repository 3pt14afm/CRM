import React from 'react';
import { IoEyeOutline } from 'react-icons/io5';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils'; // Make sure this points to your shadcn utility file

export default function ViewButton({ 
  onClick, 
  label = "View Details", 
  icon: Icon = IoEyeOutline, 
  children,
  className = "", 
  iconSize = "text-[17px]",
  side = "top",
  ...props 
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "p-1.5 flex flex-row gap-2 items-center rounded-lg bg-[#B5EBA2]/25 text-[#289800] font-semibold transition-colors hover:bg-[#B5EBA2]/40",
              className
            )}
            {...props}
          >
            <Icon className={iconSize} />
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}