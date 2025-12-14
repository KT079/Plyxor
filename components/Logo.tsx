import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 200 200" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Vertical Pillar */}
    <path 
      d="M100 20V160" 
      stroke="currentColor" 
      strokeWidth="16" 
      strokeLinecap="round"
    />
    {/* Oval */}
    <ellipse 
      cx="100" 
      cy="90" 
      rx="70" 
      ry="45" 
      stroke="currentColor" 
      strokeWidth="12"
    />
    {/* Legs */}
    <path 
      d="M100 90L40 180" 
      stroke="currentColor" 
      strokeWidth="12" 
      strokeLinecap="round"
    />
    <path 
      d="M100 90L160 180" 
      stroke="currentColor" 
      strokeWidth="12" 
      strokeLinecap="round"
    />
  </svg>
);