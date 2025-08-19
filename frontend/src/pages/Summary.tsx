import { useState, useEffect } from "react";
import axios from "axios";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // ✅ direct import
//import "./styles/printpdf.css";


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
      const res = await axios.get(
        `https://enhanced-railways.onrender.com/api/summary/${type}`
      );
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
const downloadPDF = () => {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal"); // Explicitly set font family and style

  sections.forEach((section, index) => {
    const headers =
      section.rows.length > 0
        ? Object.keys(section.rows[0]).filter((col) => col !== "id")
        : [];

    const tableData = section.rows.map((row) =>
      headers.map((header) => row[header] || "-")
    );

    // Add section title (station name) before the table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold"); // Set bold for titles
    const titleY = index === 0 ? 40 : (doc as any).lastAutoTable.finalY + 40;
    doc.text(
      section.table.replace(/_/g, " → ").toUpperCase(),
      40,
      titleY
    );

    // Render the table below the title
    autoTable(doc, {
      head: [headers.map((header) => header.replace(/_/g, " "))],
      body: tableData,
      startY: titleY + 20, // Start table 20pt below the title
      theme: "grid",
      margin: { left: 40, right: 40 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: "linebreak",
        halign: "left",
        valign: "middle",
      },
    });
    doc.setFont("helvetica", "normal"); // Reset to normal for next iteration
  });

  doc.save("master_summary.pdf");
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

        {/* Filter Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["master", "forecasted", "interchanged", "remaining"] as ViewType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`rounded-lg px-4 py-2 text-sm ${
                  viewType === type
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type === "master"
                  ? "Master (All Data)"
                  : type === "forecasted"
                  ? 'Forecasted (FC="Y")'
                  : type === "interchanged"
                  ? 'Interchanged (IC="Y")'
                  : "Remaining"}
              </button>
            )
          )}
          <button
            onClick={downloadPDF}
            disabled={viewType !== "master"}
            className={`rounded-lg px-4 py-2 text-sm ${
              viewType === "master"
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Download Master as PDF
          </button>
        </div>

        {/* Data Section */}
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
              const headers =
                section.rows.length > 0
                  ? Object.keys(section.rows[0]).filter((col) => col !== "id")
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
                              className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                            >
                              {header.replace(/_/g, " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                        {section.rows.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            {headers.map((header) => (
                              <td
                                key={`${row.id}-${header}`}
                                className={`whitespace-nowrap px-4 py-2 text-sm ${
                                  row["ic"] === "Y"
                                    ? "text-green-600 font-medium"
                                    : row["fc"] === "Y"
                                    ? "text-blue-600 font-medium"
                                    : "text-gray-500"
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