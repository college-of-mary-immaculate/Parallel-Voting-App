import React from 'react';

const VoteChart = ({ data, title, type = 'bar' }) => {
  const maxVotes = Math.max(...data.map(item => item.votes));
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);

  const getBarColor = (index) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-yellow-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    return colors[index % colors.length];
  };

  const getPercentage = (votes) => {
    return totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
  };

  if (type === 'pie') {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = getPercentage(item.votes);
              const previousPercentages = data.slice(0, index).reduce((sum, prev) => sum + getPercentage(prev.votes), 0);
              const angle = (percentage / 100) * 360;
              const startAngle = (previousPercentages / 100) * 360;
              
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              return (
                <path
                  key={item.id}
                  d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={index === 0 ? '#3B82F6' : index === 1 ? '#10B981' : index === 2 ? '#8B5CF6' : '#F59E0B'}
                  stroke="white"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalVotes}</div>
              <div className="text-xs sm:text-sm text-gray-500">Total Votes</div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <div className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${
                  index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-purple-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-700 truncate">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 ml-2 flex-shrink-0">
                {item.votes} ({getPercentage(item.votes)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3 sm:space-y-4">
        {data.map((item, index) => (
          <div key={item.id} className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-1 sm:space-y-0">
              <span className="text-sm font-medium text-gray-700 truncate sm:pr-2">{item.name}</span>
              <span className="text-sm text-gray-900 font-semibold flex-shrink-0">
                {item.votes} ({getPercentage(item.votes)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 sm:h-6">
              <div
                className={`h-4 sm:h-6 rounded-full ${getBarColor(index)} transition-all duration-500 flex items-center justify-end pr-1 sm:pr-2`}
                style={{ width: `${maxVotes > 0 ? (item.votes / maxVotes) * 100 : 0}%` }}
              >
                <span className="text-xs text-white font-medium hidden sm:inline">
                  {getPercentage(item.votes)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Total Votes</span>
          <span className="text-lg font-bold text-gray-900">{totalVotes}</span>
        </div>
      </div>
    </div>
  );
};

export default VoteChart;
