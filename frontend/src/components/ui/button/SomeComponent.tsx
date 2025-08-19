// import { jsPDF } from "jspdf";
// import autoTable from "jspdf-autotable";

// export default function DownloadPDF() {
//   const handleDownload = () => {
//     const doc = new jsPDF({
//       orientation: "landscape", // makes PDF landscape
//       unit: "pt",
//       format: "a4",
//     });

//     // Example headers & data
//     const headers = ["ID", "Name", "Email", "Role"];
//     const data = [
//       [1, "John Doe", "john@example.com", "Admin"],
//       [2, "Jane Smith", "jane@example.com", "User"],
//       [3, "Mike Brown", "mike@example.com", "Manager"],
//     ];

//     autoTable(doc, {
//       head: [headers],
//       body: data,
//       theme: "grid",
//       headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
//       styles: {
//         fontSize: 9,
//         cellPadding: 4,
//         halign: "left",
//         valign: "middle",
//       },
//       margin: { left: 40, right: 40 },
//       startY: 60,
//     });

//     // Save PDF → goes to browser Downloads folder
//     doc.save("Report.pdf");
//   };

//   return (
//     <button
//       onClick={handleDownload}
//       className="px-4 py-2 bg-blue-600 text-white rounded"
//     >
//       Download PDF
//     </button>
//   );
// }

// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// export function downloadPDF(headers: string[], data: any[][], fromStation: string, toStation: string) {
//   const doc = new jsPDF();

//   // ✅ Title
//   doc.setFontSize(14);
//   doc.setFont("helvetica", "bold");
//   doc.text("MASTER REPORT", 105, 20, { align: "center" });

//   // ✅ Stations Name (separately at top)
//   doc.setFontSize(12);
//   doc.setFont("helvetica", "bold");
//   doc.text(`From: ${fromStation}`, 40, 30);
//   doc.text(`To: ${toStation}`, 140, 30);

//   // ✅ Now the table starts BELOW stations text
//   autoTable(doc, {
//     head: [headers],
//     body: data,
//     theme: "grid",
//     headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
//     styles: {
//       fontSize: 9,
//       cellPadding: 4,
//       halign: "left",
//       valign: "middle",
//     },
//     columnStyles: {
//       1: { fontStyle: "bold" }, // "from station" column
//       2: { fontStyle: "bold" }, // "to station" column
//     },
//     margin: { left: 40, right: 40 },
//     startY: 40, // makes table start **below station names**
//   });

//   // ✅ Timestamped file name
//   const now = new Date();
//   const fileName = `MASTER_${now.toDateString().replace(/ /g, "-")}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.pdf`;

//   doc.save(fileName);
// }


import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePDF(stationName: string, headers: string[], data: any[][]) {
  const doc = new jsPDF("landscape", "pt", "a4");

  // Get formatted date/time for filename
  const now = new Date();
  const fileName = `MASTER_${now.toLocaleDateString("en-GB", {
    weekday: "short",
  })}_${now
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-")}_${now
    .toLocaleTimeString("en-GB", { hour12: false })
    .replace(/:/g, "-")}.pdf`;

  // Render the table with station name as a title
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
    columnStyles: {
      1: { fontStyle: "bold" }, // from station
      2: { fontStyle: "bold" }, // to station
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(stationName, 40, 30); // Place station name at top (Y=30)
    },
    startY: 50, // Start table below the station name
  });

  // Save PDF
  doc.save(fileName);
}
