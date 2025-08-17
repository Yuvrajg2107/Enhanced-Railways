// import {
//   ArrowDownIcon,
//   ArrowUpIcon,
//   BoxIconLine,
//   GroupIcon,
// } from "../../icons";
// import axios from 'axios';
// import Badge from "../ui/badge/Badge";
import React, { useState } from "react";

export default function EcommerceMetrics() {

  const [dashboardStats, setDashboardStats] = useState<DashboardStatsState>({
    totalInterchange: 0,
    totalForecast: 0,
    totalTrains: 0,
    loading: true,
    error: null,
  });
  interface DashboardStatsState {
    totalInterchange: number;
    totalForecast: number;
    loading: boolean;
    totalTrains: number;
    error: string | null;
  }
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/dashboard-stats');
        const data = await response.json();

        if (data.success) {
          setDashboardStats({
            ...data.stats,
            loading: false,
            error: null
          });
        } else {
          setDashboardStats(prev => ({
            ...prev,
            loading: false,
            error: data.message || 'Failed to load statistics'
          }));
        }
      } catch (error) {
        setDashboardStats(prev => ({ ...prev, loading: false, error: 'Error connecting to server' }));
        console.error('Fetch stats error:', error);
      }
    };
    fetchStats();
  }, [])


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
      {/* Metric Item 1 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] md:p-4">
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Division
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              SUR
            </h4>
          </div>
        </div>
      </div>

      {/* Metric Item 2 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] md:p-4">
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Trains
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {dashboardStats.totalTrains}
            </h4>
          </div>
        </div>
      </div>

      {/* Metric Item 3 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] md:p-4">
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Forecast
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {dashboardStats.totalForecast}
            </h4>
          </div>
        </div>
      </div>

      {/* Metric Item 4 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-white/[0.03] md:p-4">
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Interchange
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {dashboardStats.totalInterchange}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );

}
