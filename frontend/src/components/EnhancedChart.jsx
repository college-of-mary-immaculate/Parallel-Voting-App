import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, PolarArea } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

const EnhancedChart = ({ 
  type = 'bar', 
  data, 
  title, 
  options = {}, 
  className = '',
  height = 300 
}) => {
  // Default options for different chart types
  const getDefaultOptions = () => {
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
          displayColors: true,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toLocaleString();
              }
              if (context.parsed !== null) {
                label += context.parsed.toLocaleString();
              }
              return label;
            }
          }
        }
      }
    };

    switch (type) {
      case 'bar':
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
          },
          plugins: {
            ...baseOptions.plugins,
            legend: {
              ...baseOptions.plugins.legend,
              display: false
            }
          }
        };

      case 'pie':
      case 'doughnut':
        return {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              ...baseOptions.plugins.legend,
              position: 'right'
            },
            tooltip: {
              ...baseOptions.plugins.tooltip,
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          }
        };

      case 'line':
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
          },
          elements: {
            line: {
              tension: 0.4,
              borderWidth: 3
            },
            point: {
              radius: 5,
              hoverRadius: 7,
              borderWidth: 2,
              backgroundColor: '#fff'
            }
          }
        };

      case 'polarArea':
        return {
          ...baseOptions,
          scales: {
            r: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            }
          },
          plugins: {
            ...baseOptions.plugins,
            legend: {
              ...baseOptions.plugins.legend,
              position: 'right'
            }
          }
        };

      default:
        return baseOptions;
    }
  };

  // Default colors for charts
  const defaultColors = [
    'rgba(59, 130, 246, 0.8)',  // Blue
    'rgba(16, 185, 129, 0.8)',  // Green
    'rgba(139, 92, 246, 0.8)',  // Purple
    'rgba(245, 158, 11, 0.8)',  // Yellow
    'rgba(239, 68, 68, 0.8)',   // Red
    'rgba(236, 72, 153, 0.8)',  // Pink
    'rgba(14, 165, 233, 0.8)',  // Sky
    'rgba(168, 85, 247, 0.8)'   // Violet
  ];

  const borderColors = [
    'rgba(59, 130, 246, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(14, 165, 233, 1)',
    'rgba(168, 85, 247, 1)'
  ];

  // Prepare data with default colors
  const preparedData = {
    ...data,
    datasets: data.datasets?.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || defaultColors[index % defaultColors.length],
      borderColor: dataset.borderColor || borderColors[index % borderColors.length],
      borderWidth: dataset.borderWidth || (type === 'line' ? 3 : 1),
      hoverBackgroundColor: dataset.hoverBackgroundColor || defaultColors[index % defaultColors.length],
      hoverBorderColor: dataset.hoverBorderColor || borderColors[index % borderColors.length]
    })) || [
      {
        label: 'Votes',
        data: data.data || [],
        backgroundColor: defaultColors,
        borderColor: borderColors,
        borderWidth: 1
      }
    ]
  };

  const chartOptions = { ...getDefaultOptions(), ...options };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data: preparedData,
      options: chartOptions,
      className: className,
      style: { height }
    };

    switch (type) {
      case 'bar':
        return <Bar {...commonProps} />;
      case 'pie':
        return <Pie {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      case 'line':
        return <Line {...commonProps} />;
      case 'polarArea':
        return <PolarArea {...commonProps} />;
      default:
        return <Bar {...commonProps} />;
    }
  };

  return (
    <div className="w-full">
      {renderChart()}
    </div>
  );
};

export default EnhancedChart;
