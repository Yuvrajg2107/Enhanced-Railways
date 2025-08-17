import { useState, useEffect } from "react";
import axios from "axios";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";

interface SummaryData {
  table: string;
  data: any[];
}

interface SummarySection {
  table: string;
  rows: TableRow[];
}

interface TableRow {
  id: number;
  [key: string]: string | number | null;
}

type ViewType = "master" | "forecasted" | "interchanged" | "remaining";

const Summary = () => {
  const [viewType, setViewType] = useState<ViewType>("master");
  const [sections, setSections] = useState<SummarySection[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (type: ViewType) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:3002/api/summary/${type}`);
      if (!res.data.success) throw new Error("Failed to fetch summary");

      const formattedSections = res.data.data.map((section: SummaryData) => {
        const formattedRows = section.data.map((row: any, idx: number) => {
          const newRow: TableRow = { id: idx + 1 };
          for (const key in row) {
            newRow[key] = row[key] !== null ? String(row[key]) : "";
          }
          return newRow;
        });
        return { table: section.table, rows: formattedRows };
      });

      setSections(formattedSections);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Error loading data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(viewType);
  }, [viewType]);

  return (
    <>
      <PageMeta
        title="Summary Viewer | Your Application"
        description="View master, forecasted, interchanged and remaining trains"
      />
      <PageBreadcrumb pageTitle="Summary Data" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Summary Viewer
        </h3>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setViewType("master")}
            className={`rounded-lg px-4 py-2 text-sm  ${viewType === "master" ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Master (All Data)
          </button>
          <button
            onClick={() => setViewType("forecasted")}
            className={`rounded-lg px-4 py-2 text-sm ${viewType === "forecasted" ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Forecasted (FC="Y")
          </button>
          <button
            onClick={() => setViewType("interchanged")}
            className={`rounded-lg px-4 py-2 text-sm ${viewType === "interchanged" ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Interchanged (IC="Y")
          </button>
          <button
            onClick={() => setViewType("remaining")}
            className={`rounded-lg px-4 py-2 text-sm ${viewType === "remaining" ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Remaining
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <span className="ml-2">Loading data...</span>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
            {error}
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
            No data available for the selected view.
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section, idx) => {
              const headers = section.rows.length > 0
                ? Object.keys(section.rows[0]).filter(col => col !== "id")
                : [];

              return (
                <div key={idx} className="rounded-lg border border-gray-200">
                  <h4 className="rounded-t-lg bg-gray-50 px-4 py-2 font-medium text-gray-500 dark:border-gray-800 dark:bg-white/[0.03]">
                    {section.table.replace(/_/g, " → ").toUpperCase()}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 dark:border-gray-300 dark:bg-white/[0.03]">
                        <tr>
                          {headers.map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                            >
                              {header.replace(/_/g, " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                        {section.rows.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                            {headers.map((header) => (
                              <td
                                key={`${row.id}-${header}`}
                                className={`whitespace-nowrap px-4 py-2 text-sm ${row['ic'] === 'Y'
                                    ? 'text-green-600 font-medium'
                                    : row['fc'] === 'Y'
                                      ? 'text-blue-600 font-medium'
                                      : 'text-gray-500'
                                  }`}
                              >
                                {row[header] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Summary;