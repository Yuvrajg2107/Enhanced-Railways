import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function DownloadPDF() {
  const handleDownload = () => {
    const doc = new jsPDF({
      orientation: "landscape", // makes PDF landscape
      unit: "pt",
      format: "a4",
    });

    // Example headers & data
    const headers = ["ID", "Name", "Email", "Role"];
    const data = [
      [1, "John Doe", "john@example.com", "Admin"],
      [2, "Jane Smith", "jane@example.com", "User"],
      [3, "Mike Brown", "mike@example.com", "Manager"],
    ];

    autoTable(doc, {
      head: [headers],
      body: data,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        halign: "left",
        valign: "middle",
      },
      margin: { left: 40, right: 40 },
      startY: 60,
    });

    // Save PDF → goes to browser Downloads folder
    doc.save("Report.pdf");
  };

  return (
    <button
      onClick={handleDownload}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      Download PDF
    </button>
  );
}
