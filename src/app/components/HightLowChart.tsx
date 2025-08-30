import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StockData, HighLowPoint } from '../interfaces/stockData';

interface HighLowChartProps {
  stockData: StockData[];
  highLowPoints: HighLowPoint[];
  symbol: string;
  isDarkMode?: boolean;
}

const HighLowChart: React.FC<HighLowChartProps> = ({
  stockData,
  highLowPoints,
  symbol,
  isDarkMode = false,
}) => {
  // 自定義標記點
  const CustomDot = ({ cx, cy, payload }: any) => {
    const point = highLowPoints.find(
      (p) => p.date.toDateString() === new Date(payload.date).toDateString(),
    );
    if (!point) return null;

    const isHigh = point.type === 'HIGH';
    const color = isHigh ? '#2ed573' : '#ff4757';

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy + (isHigh ? -15 : 25)}
          textAnchor="middle"
          fill={color}
          fontSize={10}
          fontWeight="bold"
        >
          {isHigh ? '高' : '底'}
        </text>
        <text
          x={cx}
          y={cy + (isHigh ? -30 : 40)}
          textAnchor="middle"
          fill={color}
          fontSize={8}
        >
          {point.price.toFixed(2)}
        </text>
      </g>
    );
  };

  return (
    <div
      className={`p-4 rounded-lg transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      }`}
    >
      <h4
        className={`text-md font-semibold mb-3 transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}
      >
        📈 {symbol} - 底底高、頭頭高分析圖表
      </h4>

      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={stockData.map((item) => ({
              ...item,
              date: item.date.toISOString().split('T')[0],
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value as string).toLocaleDateString()
              }
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(2) : value,
                name === 'close' ? '收盤價' : name === 'ma5' ? 'MA5' : name,
              ]}
            />

            {/* 收盤價線 */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3742fa"
              strokeWidth={2}
              dot={<CustomDot />}
              name="收盤價"
            />

            {/* MA5線 */}
            <Line
              type="monotone"
              dataKey="ma5"
              stroke="#ffa502"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="MA5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 高低點統計 */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`p-3 rounded border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-green-900/20 border-green-700'
              : 'bg-green-50 border-green-200'
          }`}
        >
          <h5 className="text-sm font-semibold text-green-600 mb-2">
            🟢 高點序列
          </h5>
          <div className="text-xs space-y-1">
            {highLowPoints
              .filter((p) => p.type === 'HIGH')
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((point, index) => (
                <div key={index} className="text-green-600">
                  高{index + 1}: {point.price.toFixed(2)} (
                  {point.date.toLocaleDateString()})
                </div>
              ))}
          </div>
        </div>

        <div
          className={`p-3 rounded border transition-colors duration-300 ${
            isDarkMode
              ? 'bg-red-900/20 border-red-700'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <h5 className="text-sm font-semibold text-red-600 mb-2">
            🔴 底點序列
          </h5>
          <div className="text-xs space-y-1">
            {highLowPoints
              .filter((p) => p.type === 'LOW')
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((point, index) => (
                <div key={index} className="text-red-600">
                  底{index + 1}: {point.price.toFixed(2)} (
                  {point.date.toLocaleDateString()})
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HighLowChart;
