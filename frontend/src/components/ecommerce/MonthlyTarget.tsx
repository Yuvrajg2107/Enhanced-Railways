import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useState, useEffect } from "react";

interface PieData {
  name: string;
  value: number;
}

export default function MonthlyTarget() {
  // Pie charts data
  const [icData, setIcData] = useState<PieData[]>([]);
  const [wagonData, setWagonData] = useState<PieData[]>([]);
  const [loading, setLoading] = useState(true);
  // const isDark = useDarkMode();

  // // Fetch Wagon stats

  // function useDarkMode() {
  //   const [isDark, setIsDark] = useState(false);

  //   useEffect(() => {
  //     const checkDark = () =>
  //       setIsDark(document.documentElement.classList.contains("dark"));

  //     checkDark();
  //     const observer = new MutationObserver(checkDark);
  //     observer.observe(document.documentElement, { attributes: true });

  //     return () => observer.disconnect();
  //   }, []);

  //   return isDark;
  // }

  useEffect(() => {
    fetch("http://localhost:3002/api/wagon-totals", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => setWagonData(data.data))
      .catch(error => console.error("Fetch wagon error:", error));
  }, []);

  // Fetch IC stats
  useEffect(() => {
    fetch("http://localhost:3002/api/ic-stats", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setIcData(data.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Fetch IC error:", error);
        setLoading(false);
      });
  }, []);
  // IC Pie chart options
  const icPieOptions: ApexOptions = {
    chart: {
      type: 'pie',
      fontFamily: "Outfit, sans-serif",
    },
    labels: icData.map(item => item.name),
    colors: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#D0ED57'],
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Outfit, sans-serif',
      },
      y: {
        formatter: function (value: number) {
          return `${value} trains`;
        }
      }
    },
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      formatter: function (val: number, opts?: any) {
        const label = opts?.w?.config?.labels?.[opts.seriesIndex] || '';
        return `${label}: ${val.toFixed(1)}%`;
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  // Wagon Pie chart options
  const wagonPieOptions: ApexOptions = {
    chart: {
      type: 'pie',
      fontFamily: "Outfit, sans-serif",
    },
    labels: wagonData.map(item => item.name),
    colors: ['#FF4560', '#775DD0', '#00E396', '#FEB019', '#546E7A', '#26a69a'],
    tooltip: {
      theme: 'light',
      style: {
        fontSize: '12px',
        fontFamily: 'Outfit, sans-serif',
      },
      y: {
        formatter: function (value: number) {
          return `${value} wagons`;
        }
      }
    },
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      formatter: function (val: number, opts?: any) {
        const label = opts?.w?.config?.labels?.[opts.seriesIndex] || '';
        return `${label}: ${val.toFixed(1)}%`;
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  // const [isOpen, setIsOpen] = useState(false);




  if (loading) return <div>Loading...</div>;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-1 pt-1 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-3 sm:pt-3">

        {/* Pie Charts Section - Now in a column */}
        <div className="flex flex-col gap-8 mt-6">
          {/* IC Stats Chart */}
          <div className="bg-white p-4 rounded-lg shadow dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="text-md font-semibold text-center text-gray-800 dark:text-white/90 mb-4">IC Stats</h4>
            {icData.length > 0 ? (
              <Chart
                options={icPieOptions}
                series={icData.map(item => item.value)}
                type="pie"
                height={300}
              />
            ) : (
              <p className="text-center text-gray-500">No IC data available</p>
            )}
          </div>

          {/* Wagon Stats Chart */}
          <div className="bg-white p-4 rounded-lg shadow dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="text-md font-semibold text-center text-gray-800 dark:text-white/90 mb-4">Wagon Stats</h4>
            {wagonData.length > 0 ? (
              <Chart
                options={wagonPieOptions}
                series={wagonData.map(item => item.value)}
                type="pie"
                height={300}
              />
            ) : (
              <p className="text-center text-gray-500">No wagon data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}