import mysql from "mysql2/promise";
import express from "express";
import cors from "cors";
import multer from "multer";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = 3002;

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    validTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only .xlsx and .xls files are allowed"));
  },
});

// Middleware
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  })
);
const SECRET = "supersecret";

app.use(express.json());

// Database configuration
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root@123",
  database: "Railways",
  dateStrings: true,
};

let db;
let supabaseUrl = "https://pojmggviqeoezopoiija.supabase.co";
let supabaseAnonKey  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvam1nZ3ZpcWVvZXpvcG9paWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDU1MTYsImV4cCI6MjA3MDgyMTUxNn0.9cysU2JShCs0Qn9usUOkGeX71hC8F6MCkpv1xZCpEwI" 
async function connectDB() {
  try {
    // db = await mysql.createConnection(dbConfig);
    db = await createClient(supabaseUrl, supabaseAnonKey)
    // db = await postgres(connectionString)
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}

// Login endpoint (unchanged)
// older
// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;
//   try {
//     const [rows] = await db.execute(
//       "SELECT * FROM users WHERE username = ? AND password = ?",
//       [username.trim(), password]
//     );
//     if (rows.length > 0) {
//       res.json({ success: true });
//     } else {
//       res.json({ success: false, message: "Invalid username or password" });
//     }
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ success: false, message: "Error connecting to server" });
//   }
// });
const DSL_PREFIXES = ["11", "12", "14", "70", "40"];

function isDSL(loco) {
  if (!loco) return false;
  return DSL_PREFIXES.some(prefix => loco.startsWith(prefix));
}


app.get("/analysis/locos", async (req, res) => {
  try {
    const results = [];

    for (const table of allowedTables) {
      const [rows] = await db.query(`SELECT LOCO1, LOCO2 FROM \`${table}\``);

      let dslTotal = 0;
      let acTotal = 0;
      let dslMulti = 0;
      let acMulti = 0;

      for (const row of rows) {
        // LOCO1 totals
        if (isDSL(row.LOCO1)) {
          dslTotal++;
        } else {
          acTotal++;
        }

        // LOCO2 multi counts
        if (row.LOCO2 && row.LOCO2.trim() !== "") {
          if (isDSL(row.LOCO2)) {
            dslMulti++;
          } else {
            acMulti++;
          }
        }
      }

      results.push({
        route: table,
        DSL: { total: dslTotal, multi: dslMulti },
        AC: { total: acTotal, multi: acMulti }
      });
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/wagon-totals", async (req, res) => {
  try {
    const tables = [
      "SC-WADI", "WADI-SC", "GTL-WADI", "WADI-GTL", "UBL-HG", "HG-UBL",
      "LTRR-SC", "SC-LTRR", "PUNE-DD", "DD-PUNE", "MRJ-PUNE", "PUNE-MRJ",
      "SC-TJSP", "TJSP-SC"
    ];

    let totalLoaded = 0;
    let totalEmpty = 0;

    for (let tableName of tables) {
      const [result] = await db.query(
        `SELECT 
           SUM(CASE WHEN ISLOADED = 'L' THEN WAGON ELSE 0 END) AS loaded_wagons,
           SUM(CASE WHEN ISLOADED = 'E' THEN WAGON ELSE 0 END) AS empty_wagons
         FROM \`${tableName}\``
      );
      // Convert to number, handle null/undefined with || 0
      totalLoaded += Number(result[0].loaded_wagons) || 0;
      totalEmpty += Number(result[0].empty_wagons) || 0;
    }

    const data = [
      { name: "Loaded Wagons", value: totalLoaded },
      { name: "Empty Wagons", value: totalEmpty }
    ];

    console.log("Wagon totals:", data); // Debug log

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching wagon totals:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/ic-stats", async (req, res) => {
  const tables = [
    "SC-WADI", "WADI-SC", "GTL-WADI", "WADI-GTL", "UBL-HG", "HG-UBL",
    "LTRR-SC", "SC-LTRR", "PUNE-DD", "DD-PUNE", "MRJ-PUNE", "PUNE-MRJ",
    "SC-TJSP", "TJSP-SC"
  ];

  try {
    let totalIC = 0;
    let totalTrains = 0;

    for (const table of tables) {
      const [icRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE IC = 'Y'`
      );
      const [totalRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\``
      );
      totalIC += icRows[0].cnt;
      totalTrains += totalRows[0].cnt;
    }

    const data = [
      { name: "Interchanged Trains", value: totalIC },
      { name: "Non-Interchanged Trains", value: totalTrains - totalIC }
    ];

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error in /api/ic-stats:", err);
    res.status(500).json({ success: false, message: "Server error fetching IC stats" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username.trim(), password]
    );

    if (rows.length > 0) {
      const user = rows[0];

      // Create JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, designation: user.designation, firstName: user.firstname, lastName: user.lastname, email: user.email },
        SECRET,
        { expiresIn: "1d" }
      );

      // Send as httpOnly cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, // true if HTTPS
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Error connecting to server" });
  }
});
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  });
  res.json({ success: true });
});

app.get("/auth/check", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ loggedIn: true, user: decoded });
  } catch {
    res.json({ loggedIn: false });
  }
});




// Helper functions
function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / 3600);
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(Date.UTC(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate(), hours, minutes, seconds));
}

function parseDateValue(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    // Normalize separators
    let val = value.trim().replace(/[-.]/g, "/");

    // Match dd/mm/yyyy or dd/mm/yy (optional time)
    const match = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (match) {
      let [, d, m, y, h = 0, min = 0] = match;
      if (y.length === 2) {
        y = parseInt(y, 10) + 2000; // Assume 2000s for two-digit years
      }
      return new Date(Date.UTC(y, m - 1, d, h, min));
    }
  }
  return null;
}


function formatDateForDB(value) {
  const date = parseDateValue(value);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function formatTimeForDB(value) {
  const date = parseDateValue(value);
  if (!date) return null;
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const mins = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function cleanYesNo(val) {
  if (!val) return null;
  const str = String(val).trim().toUpperCase();
  if (str === 'Y' || str === 'YES') return 'Y';
  if (str === 'N' || str === 'NO') return 'N';
  return null;
}

const allowedTables = [
  "SC-WADI", "WADI-SC", "GTL-WADI", "WADI-GTL", "UBL-HG", "HG-UBL",
  "LTRR-SC", "SC-LTRR", "PUNE-DD", "DD-PUNE", "MRJ-PUNE", "PUNE-MRJ",
  "SC-TJSP", "TJSP-SC"
];

// Group into SRC-DEST & DEST-SRC pairs
const routePairs = [
  ["SC-WADI", "WADI-SC"],
  ["GTL-WADI", "WADI-GTL"],
  ["UBL-HG", "HG-UBL"],
  ["LTRR-SC", "SC-LTRR"],
  ["PUNE-DD", "DD-PUNE"],
  ["MRJ-PUNE", "PUNE-MRJ"],
  ["SC-TJSP", "TJSP-SC"]
];
// API endpoint
// Add this route to server.js

function authenticateUser(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
}

// app.get("/api/summary/:type", async (req, res) => {
//   const type = (req.params.type || "").toLowerCase(); // master | interchanged | non-interchanged
//   const allowedTypes = ["master", "interchanged", "non-interchanged"];
//   if (!allowedTypes.includes(type)) {
//     return res.status(400).json({ success: false, message: "Invalid summary type" });
//   }

//   // Ordered SRC-DEST / DEST-SRC pairs (keeps the order you requested)
//   const routePairs = [
//     ["SC-WADI", "WADI-SC"],
//     ["GTL-WADI", "WADI-GTL"],
//     ["UBL-HG", "HG-UBL"],
//     ["LTRR-SC", "SC-LTRR"],
//     ["PUNE-DD", "DD-PUNE"],
//     ["MRJ-PUNE", "PUNE-MRJ"],
//     ["SC-TJSP", "TJSP-SC"]
//   ];

//   try {
//     const results = [];

//     // Build WHERE clause according to selected type
//     let whereClause = "";
//     if (type === "interchanged") {
//       whereClause = " WHERE `IC` = 'Y' ";
//     } else if (type === "non-interchanged") {
//       whereClause = " WHERE `IC` IS NULL OR `IC` <> 'Y' ";
//     }

//     // Query each pair in order, pushing SRC-DEST then DEST-SRC
//     for (const [src, dest] of routePairs) {
//       // fetch src (SRC-DEST)
//       const [rowsSrc] = await db.query(`SELECT * FROM \`${src}\` ${whereClause}`);
//       results.push({ table: src, data: rowsSrc });

//       // fetch dest (DEST-SRC)
//       const [rowsDest] = await db.query(`SELECT * FROM \`${dest}\` ${whereClause}`);
//       results.push({ table: dest, data: rowsDest });
//     }

//     return res.json({ success: true, data: results });
//   } catch (err) {
//     console.error("Error in /api/summary/:type ->", err);
//     return res.status(500).json({ success: false, message: "Server error fetching summary" });
//   }
// });

app.get("/api/summary/:type", async (req, res) => {
  const type = (req.params.type || "").toLowerCase();
  const allowedTypes = ["master", "forecasted", "interchanged", "remaining"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid summary type" });
  }

  const routePairs = [
    ["SC-WADI", "WADI-SC"],
    ["GTL-WADI", "WADI-GTL"],
    ["UBL-HG", "HG-UBL"],
    ["LTRR-SC", "SC-LTRR"],
    ["PUNE-DD", "DD-PUNE"],
    ["MRJ-PUNE", "PUNE-MRJ"],
    ["SC-TJSP", "TJSP-SC"]
  ];

  try {
    const results = [];

    // Build WHERE clause according to selected type
    let whereClause = "";
    if (type === "forecasted") {
      whereClause = " WHERE `FC` = 'Y' ";
    } else if (type === "interchanged") {
      whereClause = " WHERE `IC` = 'Y' ";
    } else if (type === "remaining") {
      whereClause = " WHERE (`IC` IS NULL OR `IC` <> 'Y') AND (`FC` IS NULL OR `FC` <> 'Y') ";
    }
    // For "master", whereClause remains empty

    for (const [src, dest] of routePairs) {
      const [rowsSrc] = await db.query(`SELECT * FROM \`${src}\` ${whereClause}`);
      results.push({ table: src, data: rowsSrc });

      const [rowsDest] = await db.query(`SELECT * FROM \`${dest}\` ${whereClause}`);
      results.push({ table: dest, data: rowsDest });
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Error in /api/summary/:type ->", err);
    return res.status(500).json({ success: false, message: "Server error fetching summary" });
  }
});

app.get("/api/get-user-and-role", authenticateUser, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role,
    designation: req.user.designation,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName
  });
});

// Add this endpoint to your server.js
app.get("/api/forecast-vs-actual", async (req, res) => {
  // Get all table names dynamically or use your predefined list
  const tables = [
    "dd-pune", "gtl-wadi", "hg-ubl", "ltrr-sc",
    "mrj-pune", "pune-dd", "pune-mrj", "sc-ltrr",
    "sc-tjsp", "sc-wadi", "tjsp-sc", "ubl-hg",
    "wadi-gtl", "wadi-sc"
  ];

  try {
    let results = {
      Morning: { forecasted: 0, actual: 0 },
      Afternoon: { forecasted: 0, actual: 0 },
      Evening: { forecasted: 0, actual: 0 },
      Night: { forecasted: 0, actual: 0 }
    };

    for (const table of tables) {
      const [rows] = await db.query(`
    SELECT 
      CASE 
        WHEN HOUR(\`ARRIVAL\`) BETWEEN 6 AND 11 THEN 'Morning'
        WHEN HOUR(\`ARRIVAL\`) BETWEEN 12 AND 17 THEN 'Afternoon'
        WHEN HOUR(\`ARRIVAL\`) BETWEEN 18 AND 23 THEN 'Evening'
        ELSE 'Night'
      END AS time_period,
      COUNT(CASE WHEN FC = 'Y' THEN 1 END) AS forecasted,
      COUNT(CASE WHEN IC = 'Y' THEN 1 END) AS actual
    FROM \`${table}\`
    GROUP BY time_period
    ORDER BY FIELD(time_period, 'Morning', 'Afternoon', 'Evening', 'Night');
  `);

      // Aggregate results across all tables
      rows.forEach(row => {
        results[row.time_period].forecasted += row.forecasted;
        results[row.time_period].actual += row.actual;
      });
    }

    // Convert to array format for frontend
    const chartData = Object.entries(results).map(([period, counts]) => ({
      period,
      forecasted: counts.forecasted,
      actual: counts.actual
    }));

    return res.json({
      success: true,
      data: chartData.sort((a, b) =>
        ['Morning', 'Afternoon', 'Evening', 'Night'].indexOf(a.period) -
        ['Morning', 'Afternoon', 'Evening', 'Night'].indexOf(b.period)
      )
    });

  } catch (err) {
    console.error("Error in /api/forecast-vs-actual:", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching forecast comparison data"
    });
  }
});

app.get("/api/wagon-summary", async (req, res) => {
  try {
    const tables = [
      "SC-WADI", "WADI-SC",
      "GTL-WADI", "WADI-GTL",
      "UBL-HG", "HG-UBL",
      "LTRR-SC", "SC-LTRR",
      "PUNE-DD", "DD-PUNE",
      "MRJ-PUNE", "PUNE-MRJ",
      "SC-TJSP", "TJSP-SC"
    ];

    let summary = [];

    for (let tableName of tables) {
      const [result] = await db.query(
        `SELECT 
            SUM(CASE WHEN ISLOADED = 'L' THEN WAGON ELSE 0 END) AS loaded_wagons,
            SUM(CASE WHEN ISLOADED = 'E' THEN WAGON ELSE 0 END) AS empty_wagons
         FROM \`${tableName}\``
      );

      summary.push({
        route: tableName.toUpperCase(),
        loaded_wagons: result[0].loaded_wagons || 0,
        empty_wagons: result[0].empty_wagons || 0
      });
    }

    summary.sort((a, b) => a.route.localeCompare(b.route));
    res.json({ success: true, data: summary });

  } catch (err) {
    console.error("Error fetching wagon summary:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


app.get("/api/ic-fc-stats", async (req, res) => {
  // Define table pairs with direction indicators
  const tablePairs = [
    { src: "SC", dest: "WADI" },
    { src: "GTL", dest: "WADI" },
    { src: "UBL", dest: "HG" },
    { src: "LTRR", dest: "SC" },
    { src: "PUNE", dest: "DD" },
    { src: "MRJ", dest: "PUNE" },
    { src: "SC", dest: "TJSP" }
  ];

  try {
    const results = [];

    for (const pair of tablePairs) {
      const forwardTable = `${pair.src}-${pair.dest}`;
      const reverseTable = `${pair.dest}-${pair.src}`;

      // Process forward direction (SRC-DEST)
      const [forwardIC] = await db.query(
        `SELECT COUNT(*) AS count FROM \`${forwardTable}\` WHERE IC = 'Y'`
      );
      const [forwardFC] = await db.query(
        `SELECT COUNT(*) AS count FROM \`${forwardTable}\` WHERE FC = 'Y'`
      );

      // Process reverse direction (DEST-SRC)
      const [reverseIC] = await db.query(
        `SELECT COUNT(*) AS count FROM \`${reverseTable}\` WHERE IC = 'Y'`
      );
      const [reverseFC] = await db.query(
        `SELECT COUNT(*) AS count FROM \`${reverseTable}\` WHERE FC = 'Y'`
      );

      results.push({
        pair: `${pair.src}-${pair.dest}`,
        directions: [
          {
            direction: 'forward',
            tableName: forwardTable,
            IC: forwardIC[0].count,
            FC: forwardFC[0].count
          },
          {
            direction: 'reverse',
            tableName: reverseTable,
            IC: reverseIC[0].count,
            FC: reverseFC[0].count
          }
        ]
      });
    }

    return res.json({
      success: true,
      data: results
    });

  } catch (err) {
    console.error("Error in /api/ic-fc-stats ->", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching IC/FC stats"
    });
  }
});


app.get("/api/dashboard-stats", async (req, res) => {
  // All tables to check
  const tables = [
    "SC-WADI", "WADI-SC",
    "GTL-WADI", "WADI-GTL",
    "UBL-HG", "HG-UBL",
    "LTRR-SC", "SC-LTRR",
    "PUNE-DD", "DD-PUNE",
    "MRJ-PUNE", "PUNE-MRJ",
    "SC-TJSP", "TJSP-SC"
  ];

  try {
    let totalICCount = 0;
    let totalFCCount = 0;
    let totalTrainCount = 0;
    const perTableCounts = [];

    for (const table of tables) {
      const [countRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE IC = 'Y'`
      );

      const [fcRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE FC = 'Y'`
      );

      const [totalRows] = await db.query(
        `SELECT COUNT(*) AS cnt FROM \`${table}\``
      );

      const count = countRows[0].cnt;
      perTableCounts.push({ table, count });
      totalICCount += count;
      totalFCCount += fcRows[0].cnt;

      // Each row represents a train, so total rows is total trains
      totalTrainCount += totalRows[0].cnt;
    }

    return res.json({
      success: true,
      stats: {
        totalTrains: totalTrainCount,
        totalInterchange: totalICCount,
        totalForecast: totalFCCount,
        // You might want to add more stats here if needed
      },
      breakdown: perTableCounts
    });

  } catch (err) {
    console.error("Error in /api/dashboard-stats ->", err);
    return res.status(500).json({
      success: false,
      message: "Server error fetching dashboard statistics"
    });
  }
});

app.get("/api/route/:tableName", async (req, res) => {
  try {
    const tableName = req.params.tableName;

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ success: false, message: "Invalid route" });
    }

    const [rows] = await db.query(`SELECT * FROM \`${tableName}\``);
    res.json({ success: true, data: rows });

  } catch (error) {
    console.error("Error fetching route data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




// Process Excel and update database
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    // Process routes
    const processedRoutes = await processExcelData(data);

    res.json({
      success: true,
      message: "Database updated successfully",
      routes: processedRoutes,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "File processing failed"
    });
  }
});
function normalizeRoute(route) {
  if (!route || !route.includes("-")) return route;
  const [src, dest] = route.split("-");
  return [src, dest].sort().join("-"); // alphabetical order to merge reverse
}
// Core processing function
async function processExcelData(data) {
  const ROUTE_COL = 29; // Column AD (0-based index)
  const processedRoutes = [];
  let currentRoute = null;
  let startRow = 3; // Data starts at row 4 (0-based index 3)

  for (let i = 3; i < data.length; i++) {
    const route = (data[i][ROUTE_COL] || '').toString().trim();
    const normalizedRoute = route ? route.replace(/\s*-\s*/g, "-") : null;

    // New route block detected
    if (normalizedRoute && normalizedRoute !== currentRoute) {
      if (currentRoute) {
        // Process previous block
        const result = await processRouteBlock(
          currentRoute,
          data,
          startRow,
          i - 1
        );
        processedRoutes.push(result);
      }
      currentRoute = normalizedRoute;
      startRow = i;
    }
  }

  // Process last route block
  if (currentRoute) {
    const result = await processRouteBlock(
      currentRoute,
      data,
      startRow,
      data.length - 1
    );
    processedRoutes.push(result);
  }

  return processedRoutes;
}

// Process a single route block
async function processRouteBlock(route, data, startRow, endRow) {
  // Generate reverse route name
  const [src, dest] = route.split("-");
  const reverseRoute = `${dest}-${src}`;

  // Extract data for both directions
  const srcDestData = extractRakeData(data, startRow, endRow, "SRC-DEST");
  const destSrcData = extractRakeData(data, startRow, endRow, "DEST-SRC");

  // Update database
  await updateRouteTable(route, srcDestData);
  await updateRouteTable(reverseRoute, destSrcData);

  return {
    route,
    reverseRoute,
    srcDestCount: srcDestData.length,
    destSrcCount: destSrcData.length
  };
}

// Extract rake data with all columns
function extractRakeData(data, startRow, endRow, direction) {
  const config = direction === "SRC-DEST"
    ? {
      rakeId: 1,     // B
      from: 4,       // E
      to: 5,         // F
      type: 2,       // C
      isLoaded: 3,   // D
      loco: 10,      // K
      base: 12,      // M
      dueDate: 14,   // O
      wagon: 7,      // H
      bpcStn: 18,    // S
      bpcDate: 17,   // R
      bpcType: 15,   // P
      arrival: 25,   // Z
      stts: 23,      // X
      loc: 24,       // Y
      ic: 27,        // AB
      fc: 26         // AA
    }
    : {
      rakeId: 32,    // AG
      from: 35,      // AJ
      to: 36,        // AK
      type: 33,      // AH
      isLoaded: 34,  // AI
      loco: 41,      // AP
      base: 43,      // AR
      dueDate: 45,   // AT
      wagon: 38,     // AM
      bpcStn: 49,    // AX
      bpcDate: 48,   // AW
      bpcType: 46,   // AU
      arrival: 56,   // BE
      stts: 54,      // BC
      loc: 55,       // BD
      ic: 58,        // BG
      fc: 57         // BF
    };

  const rakes = [];
  let r = startRow;

  while (r <= endRow) {
    const row = data[r] || [];
    const nextRow = r + 1 <= endRow ? (data[r + 1] || []) : [];

    const rakeId = row[config.rakeId] !== undefined ? (row[config.rakeId] || '').toString().trim() : '';

    // Skip empty rake IDs
    if (!rakeId) {
      r++;
      continue;
    }

    // Check if next row has no rake ID (potential second loco)
    const nextRakeId = nextRow[config.rakeId] !== undefined ? (nextRow[config.rakeId] || '').toString().trim() : '';
    let hasSecondLoco = nextRakeId === '' && r + 1 <= endRow;

    // Extract loco numbers
    const loco1 = row[config.loco] !== undefined ? (row[config.loco] || '').toString().trim() : '';
    const loco2 = hasSecondLoco ? (nextRow[config.loco] !== undefined ? (nextRow[config.loco] || '').toString().trim() : '') : '';

    // Check for more than 2 loco numbers
    const allLocos = [loco1, loco2]
      .filter(Boolean)
      .join(',')
      .split(/[\s,/|]+/)
      .filter(Boolean);

    if (allLocos.length > 2) {
      r += hasSecondLoco ? 2 : 1;
      continue;
    }

    // Get first non-empty value for fields that might have duplicates
    const getFirstValue = (col) => {
      let val = row[col] !== undefined ? row[col] : '';
      if (val !== '' && val !== null) return val;

      if (hasSecondLoco) {
        val = nextRow[col] !== undefined ? nextRow[col] : '';
        if (val !== '' && val !== null) return val;
      }

      return null;
    };

    // Create rake object
    const rake = {
      rakeId: rakeId,
      from: row[config.from] !== undefined ? (row[config.from] || '').toString().trim() : null,
      to: row[config.to] !== undefined ? (row[config.to] || '').toString().trim() : null,
      type: row[config.type] !== undefined ? (row[config.type] || '').toString().trim() : null,
      isLoaded: row[config.isLoaded] !== undefined ? (row[config.isLoaded] || '').toString().trim() : null,
      loco1: loco1 || null,
      loco2: loco2 || null,
      base: getFirstValue(config.base) ? (getFirstValue(config.base) || '').toString().trim() : null,
      dueDate: formatDateForDB(getFirstValue(config.dueDate)),
      wagon: getFirstValue(config.wagon) ? (getFirstValue(config.wagon) || '').toString().trim() : null,
      bpcStn: getFirstValue(config.bpcStn) ? (getFirstValue(config.bpcStn) || '').toString().trim() : null,
      bpcDate: formatDateForDB(getFirstValue(config.bpcDate)),
      bpcType: getFirstValue(config.bpcType) ? (getFirstValue(config.bpcType) || '').toString().trim() : null,
      arrival: formatTimeForDB(getFirstValue(config.arrival)),
      stts: getFirstValue(config.stts) ? (getFirstValue(config.stts) || '').toString().trim() : null,
      loc: getFirstValue(config.loc) ? (getFirstValue(config.loc) || '').toString().trim() : null,
      ic: cleanYesNo(getFirstValue(config.ic)),
      fc: cleanYesNo(getFirstValue(config.fc))
    };

    rakes.push(rake);

    // Move to next row
    r += hasSecondLoco ? 2 : 1;
  }

  return rakes;
}


// Update database table
async function updateRouteTable(tableName, rakes) {
  if (!rakes.length) return;

  try {
    // 🚨 Clear the table before inserting new data
    await db.query(`TRUNCATE TABLE \`${tableName}\``);
    console.log(`Truncated table ${tableName}`);

    const columns = [
      "`RAKE ID`", "`FROM`", "`TO`", "`TYPE`", "`ISLOADED`",
      "`LOCO1`", "`LOCO2`", "`BASE`", "`DUE DATE`", "`WAGON`",
      "`BPC_STN`", "`BPC_DATE`", "`BPC_TYPE`", "`ARRIVAL`",
      "`STTS`", "`LOC`", "`IC`", "`FC`"
    ];

    const values = rakes.map(rake => [
      rake.rakeId,
      rake.from,
      rake.to,
      rake.type,
      rake.isLoaded,
      rake.loco1,
      rake.loco2,
      rake.base,
      rake.dueDate,
      rake.wagon,
      rake.bpcStn,
      rake.bpcDate,
      rake.bpcType,
      rake.arrival,
      rake.stts,
      rake.loc,
      rake.ic,
      rake.fc
    ]);

    const placeholders = columns.map(() => "?").join(", ");
    const query = `
      INSERT IGNORE INTO \`${tableName}\` 
        (${columns.join(", ")})
      VALUES ${values.map(() => `(${placeholders})`).join(", ")}
    `;

    const flatValues = values.flat();
    await db.query(query, flatValues);
    console.log(`Inserted ${rakes.length} rakes into ${tableName}`);

    return rakes.length;
  } catch (error) {
    console.error(`Error updating ${tableName}:`, error);
    throw new Error(`Database update failed for ${tableName}`);
  }
}


// Health check and server start
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});



async function startServer() {
  await connectDB();
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

startServer();