import React from 'react';

export default function W_Strategy({
  selectedStrategy,
  isDarkMode,
}: {
  selectedStrategy: string;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={`mb-6 ${
        selectedStrategy === 'W_Strategy' ? 'block' : 'hidden'
      }`}
    >
      <h3
        className={`text-lg font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-700'
        }`}
      >
        回後買上漲策略參數
      </h3>
    </div>
  );
}
