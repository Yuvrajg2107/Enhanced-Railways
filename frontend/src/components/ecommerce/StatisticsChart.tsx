import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useEffect, useState } from "react";

// Define types for the data
interface IcFcDataItem {
  name: string;
  IC: number;
  FC: number;
  direction: string;
}

export default function StatisticsChart() {
  const [icFcData, setIcFcData] = useState<IcFcDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIcFcStats = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/ic-fc-stats');
        const data = await response.json();

        if (data.success) {
          // Transform data for the chart
          const chartData = data.data.flatMap((pair: any) =>
            pair.directions.map((dir: any) => ({
              name: dir.tableName,
              IC: dir.IC,
              FC: dir.FC,
              direction: dir.direction === 'forward' ? `${pair.pair}` : `${pair.pair.split('-').reverse().join('-')}`
            }))
          );
          setIcFcData(chartData);
        }
      } catch (error) {
        console.error('Error fetching IC/FC stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIcFcStats();
  }, []);

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      fontFamily: "Outfit, sans-serif",
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ["#304758"]
      }
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: icFcData.map(item => item.name),
      labels: {
        rotate: -45,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Count'
      }
    },
    fill: {
      opacity: 1
    },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return val.toString();
        }
      }
    },
    colors: ["#8884d8", "#82ca9d"],
    legend: {
      position: 'top',
      horizontalAlign: 'center'
    }
  };

  const series = [
    {
      name: 'Interchange (IC)',
      data: icFcData.map(item => item.IC)
    },
    {
      name: 'Forecast (FC)',
      data: icFcData.map(item => item.FC)
    }
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            IC/FC Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Interchange and Forecast counts by table
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading data...</p>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px] xl:min-w-full">
            <Chart 
              options={options} 
              series={series} 
              type="bar" 
              height={350} 
            />
          </div>
        </div>
      )}
    </div>
  );
}