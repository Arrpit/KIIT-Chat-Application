import React from 'react'

function Logo({ width = '100px', height = 'auto', className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100"
      width={width}
      height={height}
      className={className}
    >
      <rect width="100" height="100" rx="15" fill="#4FC3F7" />
      <g transform="translate(15, 15) scale(0.7)">
        <path d="M30 30 Q50 0 70 30" fill="#4CAF50" />
        <rect x="25" y="30" width="50" height="40" rx="20" fill="#FFFFFF" />
        <circle cx="40" cy="50" r="5" fill="#4CAF50" />
        <circle cx="50" cy="50" r="5" fill="#4CAF50" />
        <circle cx="60" cy="50" r="5" fill="#4CAF50" />
      </g>
      <text 
        x="50" 
        y="95" 
        textAnchor="middle" 
        fill="#37474F" 
        fontFamily="Arial" 
        fontWeight="bold" 
        fontSize="12"
      >
        ONLINE CHAT
      </text>
    </svg>
  )
}

export default Logo