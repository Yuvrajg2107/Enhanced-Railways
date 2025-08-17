import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";
import './ecommerce.css';

interface ForecastData {
  period: string;
  forecasted: number;
  actual: number;
}

function ForecastVsActualChart() {
  const [chartData, setChartData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/forecast-vs-actual');
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        console.log(data)
        if (data.success) {
          setChartData(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const options: ApexOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
      zoom: { enabled: false }
    },
    stroke: {
      width: 3,
      curve: 'smooth'
    },
    xaxis: {
      categories: chartData.map(item => item.period),
      labels: { style: { fontSize: '12px' } }
    },
    yaxis: {
      title: { text: 'Interchanges' }
    },
    tooltip: {
      theme: 'light',
      y: { formatter: (val: number) => `${val} interchanges` }
    },
    colors: ['#ff7300', '#387908'],
    legend: {
      position: 'top',
      horizontalAlign: 'center'
    },
    grid: {
      show: true,
      strokeDashArray: 3
    }
  };

  const series = [
    {
      name: 'Forecasted',
      data: chartData.map(item => item.forecasted)
    },
    {
      name: 'Actual',
      data: chartData.map(item => item.actual)
    }
  ];

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Forecast vs Actual Interchanges
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last 24 hours comparison
        </p>
      </div>

      <div className="mt-4">
        <Chart
          options={options}
          series={series}
          type="line"
          height={350}
        />
      </div>
    </div>
  );
}

export default function MonthlySalesChart() {

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <ForecastVsActualChart />
      </div>
    </div>
  );
}
