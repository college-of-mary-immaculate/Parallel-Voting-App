import React, { useState, useEffect } from 'react';
import EnhancedChart from './EnhancedChart';

const AdvancedAnalytics = ({ data, title, type = 'bar', height = 400 }) => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process data based on type
    const processedData = processDataByType(data, type);
    setChartData(processedData);
    setLoading(false);
  }, [data, type]);

  const processDataByType = (rawData, chartType) => {
    switch (chartType) {
      case 'voterTurnout':
        return {
          labels: rawData.map(item => item.timeRange),
          datasets: [{
            label: 'Voter Turnout (%)',
            data: rawData.map(item => item.turnout),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2
          }]
        };

      case 'votingPatterns':
        return {
          labels: rawData.map(item => item.hour),
          datasets: [{
            label: 'Votes per Hour',
            data: rawData.map(item => item.votes),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
            fill: true
          }]
        };

      case 'candidateComparison':
        return {
          labels: rawData.map(item => item.candidate),
          datasets: [
            {
              label: 'Primary Votes',
              data: rawData.map(item => item.primaryVotes),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1
            },
            {
              label: 'Secondary Votes',
              data: rawData.map(item => item.secondaryVotes),
              backgroundColor: 'rgba(139, 92, 246, 0.8)',
              borderColor: 'rgba(139, 92, 246, 1)',
              borderWidth: 1
            }
          ]
        };

      case 'demographics':
        return {
          labels: rawData.map(item => item.category),
          datasets: [{
            label: 'Voters',
            data: rawData.map(item => item.count),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)'
            ],
            borderWidth: 1
          }]
        };

      case 'regionalAnalysis':
        return {
          labels: rawData.map(item => item.region),
          datasets: [{
            label: 'Vote Distribution',
            data: rawData.map(item => item.votes),
            backgroundColor: 'rgba(14, 165, 233, 0.8)',
            borderColor: 'rgba(14, 165, 233, 1)',
            borderWidth: 2
          }]
        };

      default:
        return {
          labels: [],
          datasets: []
        };
    }
  };

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 12,
              family: 'system-ui, -apple-system, sans-serif'
            },
            padding: 20,
            usePointStyle: true
          }
        },
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
            family: 'system-ui, -apple-system, sans-serif'
          },
          padding: {
            top: 10,
            bottom: 30
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 12
          },
          padding: 12,
          cornerRadius: 8,
          displayColors: true
        }
      }
    };

    // Type-specific options
    if (type === 'voterTurnout' || type === 'votingPatterns') {
      return {
        ...baseOptions,
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              borderDash: [5, 5],
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              font: {
                size: 11
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          }
        }
      };
    }

    return baseOptions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <EnhancedChart
        type={type === 'voterTurnout' || type === 'votingPatterns' ? 'line' : 'bar'}
        data={chartData}
        options={getChartOptions()}
        height={height}
      />
    </div>
  );
};

export default AdvancedAnalytics;
