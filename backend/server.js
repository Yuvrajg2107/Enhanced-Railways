import mysql from "mysql2/promise";
import express from "express";
import cors from "cors";
import multer from "multer";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT ||3002;

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
    origin: ["http://localhost:5173", "http://localhost:3000", "https://enhanced-railways-1.onrender.com/"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  })
);
const SECRET = "supersecret";

app.use(express.json());


let supabase;
let supabaseUrl = "https://pojmggviqeoezopoiija.supabase.co";
let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvam1nZ3ZpcWVvZXpvcG9paWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDU1MTYsImV4cCI6MjA3MDgyMTUxNn0.9cysU2JShCs0Qn9usUOkGeX71hC8F6MCkpv1xZCpEwI"
async function connectDB() {
  try {
    supabase = await createClient(supabaseUrl, supabaseAnonKey)
    // db = await postgres(connectionString)
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
}
const DSL_PREFIXES = ["11", "12", "14", "70", "40"];

function isDSL(loco) {
  if (!loco) return false;
  return DSL_PREFIXES.some(prefix => loco.startsWith(prefix));
}



app.get("/analysis/locos", async (req, res) => {
  try {
    const results = [];

    for (const table of allowedTables) {
      // Get LOCO1 and LOCO2 columns from this table
      const { data: rows, error } = await supabase
        .from(table) // table name directly, no backticks
        .select('loco1, loco2');

      if (error) {
        // console.error(`Error fetching table ${table}:`, error);
        continue; // skip to next table if query fails
      }

      let dslTotal = 0;
      let acTotal = 0;
      let dslMulti = 0;
      let acMulti = 0;

      for (const row of rows) {
        // LOCO1 totals
        if (isDSL(row.loco1)) {
          dslTotal++;
        } else {
          acTotal++;
        }

        // LOCO2 multi counts
        if (row.loco2 && row.loco2.trim() !== "") {
          if (isDSL(row.loco2)) {
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
    // console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/api/wagon-totals", async (req, res) => {
  try {
    const tables = [
      "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
      "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
      "sc_tjsp", "tjsp_sc"
    ];

    let totalLoaded = 0;
    let totalEmpty = 0;

    for (let tableName of tables) {
      const { data, error } = await supabase
        .from(tableName) // table names are fine as strings
        .select(`
          loaded_wagons:wagon,
          isloaded:isloaded
        `);

      if (error) {
        // console.error(`Error fetching ${tableName}:`, error);
        continue; // skip this table if there's a problem
      }

      // Summation logic in JS instead of SQL
      for (const row of data) {
        if (row.isloaded === 'L') {
          totalLoaded += row.loaded_wagons || 0;
        } else if (row.isloaded === 'E') {
          totalEmpty += row.loaded_wagons || 0;
        }
      }
    }

    const resultData = [
      { name: "Loaded Wagons", value: totalLoaded },
      { name: "Empty Wagons", value: totalEmpty }
    ];

    // console.log("Wagon totals:", resultData);

    res.json({ success: true, data: resultData });
  } catch (err) {
    // console.error("Error fetching wagon totals:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/ic-stats", async (req, res) => {
  const tables = [
    "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
    "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
    "sc_tjsp", "tjsp_sc"
  ];

  try {
    let totalIC = 0;
    let totalTrains = 0;

    for (const table of tables) {
      // Count IC = 'Y' records
      const { count: icCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('ic', 'Y');

      // Count all records
      const { count: totalCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      totalIC += icCount || 0;
      totalTrains += totalCount || 0;
    }

    const data = [
      { name: "Interchanged Trains", value: totalIC },
      { name: "Non-Interchanged Trains", value: totalTrains - totalIC }
    ];

    res.json({ success: true, data });
  } catch (err) {
    // console.error("Error in /api/ic-stats:", err);
    res.status(500).json({ success: false, message: "Server error fetching IC stats" });
  }
});

// app.post("/api/login", async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     // Supabase equivalent of the MySQL query
//     const { data: users, error } = await supabase
//       .from('users')
//       .select('*')
//       .eq('username', username.trim())
//       .eq('password', password);

//     // console.log(data)
//     if (error) throw error;

//     if (users && users.length > 0) {
//       const user = users[0];

//       // Create JWT token (same as original)
//       const token = jwt.sign(
//         {
//           id: user.id,
//           username: user.username,
//           role: user.role,
//           designation: user.designation,
//           firstName: user.firstname,
//           lastName: user.lastname,
//           email: user.email
//         },
//         SECRET,
//         { expiresIn: "1d" }
//       );

//       // Send as httpOnly cookie (same as original)
//       res.cookie("token", token, {
//         httpOnly: true,
//         secure: false, // keeping false as per your original
//         sameSite: "lax",
//         maxAge: 24 * 60 * 60 * 1000 // 1 day
//       });
//       // console.log('success')
//       return res.json({ success: true });
//     } else {
//       f
//       return res.json({ success: false, message: "Invalid username or password" });
//     }
//   } catch (error) {
//     // console.error("Login error:", error);
//     res.status(500).json({ success: false, message: "Error connecting to server" });
//   }
// });

// app.post("/api/logout", (req, res) => {
//   res.clearCookie("token", {
//     httpOnly: true,
//     secure: false,
//     sameSite: "lax"
//   });
//   res.json({ success: true });
// });

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Supabase equivalent of the MySQL query 
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password);

    if (error) throw error;

    if (users && users.length > 0) {
      const user = users[0];

      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          designation: user.designation,
          firstName: user.firstname,
          lastName: user.lastname,
          email: user.email
        },
        SECRET,
        { expiresIn: "1d" }
      );

      // Send as httpOnly cookie with updated options
      res.cookie("token", token, {
        httpOnly: true,
        secure: true, // Updated to true for HTTPS (Render deployment)
        sameSite: "none", // Updated to 'none' for cross-origin support
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error connecting to server" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true, // Updated to match login's secure setting
    sameSite: "none" // Updated to match login's sameSite setting
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
  "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
  "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
  "sc_tjsp", "tjsp_sc"
];


// Add this route to server.js

// function authenticateUser(req, res, next) {
//   const token = req.cookies.token;
//   if (!token) {
//     return res.status(401).json({ message: "Not authenticated" });
//   }

//   try {
//     const decoded = jwt.verify(token, SECRET);
//     req.user = decoded; // { id, username, role }
//     next();
//   } catch (err) {
//     res.status(403).json({ message: "Invalid token" });
//   }
// }
function authenticateUser(req, res, next) {
  const token = req.cookies.token;
  console.log("Token received:", token); // Add this for debugging
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { id, username, role }
    console.log("Decoded user:", req.user); // Add this for debugging
    next();
  } catch (err) {
    console.log("Token verification error:", err.message); // Add this for debugging
    res.status(403).json({ message: "Invalid token" });
  }
}

app.get("/api/summary/:type", async (req, res) => {
  const type = (req.params.type || "").toLowerCase();
  const allowedTypes = ["master", "forecasted", "interchanged", "remaining"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid summary type" });
  }

  const routePairs = [
    ["sc_wadi", "wadi_sc"],
    ["gtl_wadi", "wadi_gtl"],
    ["ubl_hg", "hg_ubl"],
    ["ltrr_sc", "sc_ltrr"],
    ["pune_dd", "dd_pune"],
    ["mrj_pune", "pune_mrj"],
    ["sc_tjsp", "tjsp_sc"]
  ];


  try {
    const results = [];

    // Build WHERE clause according to selected type
    let queryFilter = {};
    if (type === "forecasted") {
      queryFilter = { fc: 'Y' };
    } else if (type === "interchanged") {
      queryFilter = { ic: 'Y' };
    } else if (type === "remaining") {
      queryFilter = {
        or: [
          { IC: { is: null } },
          { IC: { neq: 'Y' } },
          { FC: { is: null } },
          { FC: { neq: 'Y' } }
        ]
      };
    }
    // For "master", queryFilter remains empty

    for (const [src, dest] of routePairs) {
      // Query source table
      const { data: srcData, error: srcError } = await supabase
        .from(src)
        .select('*')
        .match(queryFilter);

      if (srcError) throw srcError;
      results.push({ table: src, data: srcData });

      // Query destination table
      const { data: destData, error: destError } = await supabase
        .from(dest)
        .select('*')
        .match(queryFilter);

      if (destError) throw destError;
      results.push({ table: dest, data: destData });
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Error in /api/summary/:type ->", err);
    return res.status(500).json({ success: false, message: "Server error fetching summary" });
  }
});

// app.get("/api/get-user-and-role", authenticateUser, (req, res) => {
//   res.json({
//     username: req.user.username,
//     role: req.user.role,
//     designation: req.user.designation,
//     email: req.user.email,
//     firstName: req.user.firstName,
//     lastName: req.user.lastName
//   });
// });
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
  const tables = [
    "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
    "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
    "sc_tjsp", "tjsp_sc"
  ];


  try {
    let results = {
      Morning: { forecasted: 0, actual: 0 },
      Afternoon: { forecasted: 0, actual: 0 },
      Evening: { forecasted: 0, actual: 0 },
      Night: { forecasted: 0, actual: 0 }
    };

    for (const table of tables) {
      // First get all relevant data from the table
      const { data: rows, error } = await supabase
        .from(table)
        .select('arrival, fc, ic');

      if (error) throw error;

      // Process rows in JavaScript instead of SQL
      const timePeriods = rows.reduce((acc, row) => {
        if (!row.arrival || typeof row.arrival !== 'string') {
          console.warn(`Skipping row with invalid arrival: ${row.arrival}`);
          return acc;
        }
        // Ensure arrival is a valid HH:MM:SS format
        const timeMatch = row.arrival.match(/^(\d{2}):(\d{2}):(\d{2})$/);
        if (!timeMatch) {
          console.warn(`Invalid time format for arrival: ${row.arrival}`);
          return acc;
        }
        const hour = parseInt(timeMatch[1], 10);
        let period;

        if (hour >= 6 && hour <= 11) period = 'Morning';
        else if (hour >= 12 && hour <= 17) period = 'Afternoon';
        else if (hour >= 18 && hour <= 23) period = 'Evening';
        else period = 'Night';

        if (!acc[period]) {
          acc[period] = { forecasted: 0, actual: 0 };
        }

        if (row.fc === 'Y') acc[period].forecasted++;
        if (row.ic === 'Y') acc[period].actual++;

        return acc;
      }, {});

      // Aggregate results
      Object.entries(timePeriods).forEach(([period, counts]) => {
        results[period].forecasted += counts.forecasted;
        results[period].actual += counts.actual;
      });
    }

    // Convert to array format for frontend (same as original)
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
      "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
      "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
      "sc_tjsp", "tjsp_sc"
    ];



    let summary = [];

    for (let tableName of tables) {
      // Get loaded wagons count
      const { count: loadedWagons, error: loadedError } = await supabase
        .from(tableName)
        .select("wagon", { count: "exact", head: true })
        .eq("isloaded", "L");

      if (loadedError) throw loadedError;

      const { count: emptyWagons, error: emptyError } = await supabase
        .from(tableName)
        .select("wagon", { count: "exact", head: true })
        .eq("isloaded", "E");

      if (emptyError) throw emptyError;

      summary.push({
        route: tableName.toUpperCase(),
        loaded_wagons: loadedWagons || 0,
        empty_wagons: emptyWagons || 0
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
  // Define table pairs with direction indicators (same as original)
  const tablePairs = [
    { src: "sc", dest: "wadi" },
    { src: "gtl", dest: "wadi" },
    { src: "ubl", dest: "hg" },
    { src: "ltrr", dest: "sc" },
    { src: "pune", dest: "dd" },
    { src: "mrj", dest: "pune" },
    { src: "sc", dest: "tjsp" }
  ];


  try {
    const results = [];

    for (const pair of tablePairs) {
      const forwardTable = `${pair.src}_${pair.dest}`;
      const reverseTable = `${pair.dest}_${pair.src}`;

      // Process forward direction (SRC-DEST)
      const { count: forwardIC } = await supabase
        .from(forwardTable)
        .select('*', { count: 'exact', head: true })
        .eq('ic', 'Y');

      const { count: forwardFC } = await supabase
        .from(forwardTable)
        .select('*', { count: 'exact', head: true })
        .eq('fc', 'Y');

      // Process reverse direction (DEST-SRC)
      const { count: reverseIC } = await supabase
        .from(reverseTable)
        .select('*', { count: 'exact', head: true })
        .eq('ic', 'Y');

      const { count: reverseFC } = await supabase
        .from(reverseTable)
        .select('*', { count: 'exact', head: true })
        .eq('fc', 'Y');

      results.push({
        pair: `${pair.src}_${pair.dest}`,
        directions: [
          {
            direction: 'forward',
            tableName: forwardTable,
            IC: forwardIC || 0,  // Ensure we return 0 instead of null
            FC: forwardFC || 0
          },
          {
            direction: 'reverse',
            tableName: reverseTable,
            IC: reverseIC || 0,
            FC: reverseFC || 0
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
  const tables = [
    "sc_wadi", "wadi_sc", "gtl_wadi", "wadi_gtl", "ubl_hg", "hg_ubl",
    "ltrr_sc", "sc_ltrr", "pune_dd", "dd_pune", "mrj_pune", "pune_mrj",
    "sc_tjsp", "tjsp_sc"
  ];

  try {
    let totalICCount = 0;
    let totalFCCount = 0;
    let totalTrainCount = 0;
    const perTableCounts = [];

    for (const table of tables) {
      // Get IC count
      const { count: icCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('ic', 'Y');

      // Get FC count
      const { count: fcCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('fc', 'Y');

      // Get total count
      const { count: totalCount } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      perTableCounts.push({
        table,
        count: icCount || 0
      });

      totalICCount += icCount || 0;
      totalFCCount += fcCount || 0;
      totalTrainCount += totalCount || 0;
    }

    return res.json({
      success: true,
      stats: {
        totalTrains: totalTrainCount,
        totalInterchange: totalICCount,
        totalForecast: totalFCCount,
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
    const tableName = req.params.tableName.toLowerCase();

    // Make sure to define allowedTables somewhere in your code
    // Example: const allowedTables = ["SC-WADI", "WADI-SC", ...];
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ success: false, message: "Invalid route" });
    }

    // Supabase equivalent query
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) throw error;

    res.json({ success: true, data });

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

function normalizeRoute(rawRoute) {
  if (!rawRoute || typeof rawRoute !== "string") return "";

  rawRoute = rawRoute.trim();
  if (!rawRoute) return "";

  // normalize dash and remove extra spaces
  const parts = rawRoute.split(/\s*-\s*/); // split on "-" with optional spaces
  if (parts.length !== 2) {
    // console.log("Skipping unknown route: actual route is", rawRoute);
    return "";
  }
  // console.log(`input: ${rawRoute} -> normalized: ${parts[0].toLowerCase() + "_" + parts[1].toLowerCase()}`)
  return parts[0].toLowerCase() + "_" + parts[1].toLowerCase();
}


// Core processing function
async function processExcelData(data) {
  const ROUTE_COL = 29; // Column AD (0-based index)
  const processedRoutes = [];
  let currentRoute = null;
  let startRow = 3; // Data starts at row 4 (0-based index 3)
  for (let i = 3; i < data.length; i++) {
    const route = (data[i][ROUTE_COL] || '').toString().trim();
    if (!route) {
      continue;
    }
    const normalizedRoute = normalizeRoute(route);
    // console.log("normalizedRoute: " + normalizedRoute)
    if (!allowedTables.includes(normalizedRoute)) {
      console.warn(`Skipping unknown route: ${normalizedRoute} actual route is ${route}`);
      return;
    }

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
  const [src, dest] = route.split("_");
  const reverseRoute = `${dest}_${src}`;
  // console.log(reverseRoute)
  // Extract data for both directions
  const srcDestData = extractRakeData(data, startRow, endRow, "SRC-DEST");
  const destSrcData = extractRakeData(data, startRow, endRow, "DEST-SRC");

  // console.log("destSrcData length:", destSrcData.length, "for", reverseRoute);

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

  // console.log("Total table names recieving: " + tableName);
  try {
    // 🚨 Clear the table before inserting new data
    const { error: truncateError } = await supabase
      .from(tableName)
      .delete()
      .neq('rake_id', 0); // Delete all records (assuming 'id' exists)

    if (truncateError) throw truncateError;
    // console.log(`Truncated table ${tableName}`);

    // Prepare data for insertion
    const records = rakes.map(rake => ({
      "rake_id": rake.rakeId ? rake.rakeId.trim() : null,
      "from_station": rake.from,
      "to_station": rake.to,
      "type": rake.type,
      "isloaded": rake.isLoaded,
      "loco1": rake.loco1,
      "loco2": rake.loco2,
      "base": rake.base,
      "due_date": rake.dueDate,
      "wagon": rake.wagon ? parseInt(rake.wagon, 10) : null, // Ensure integer
      "bpc_stn": rake.bpcStn,
      "bpc_date": rake.bpcDate,
      "bpc_type": rake.bpcType,
      "arrival": rake.arrival,
      "stts": rake.stts,
      "loc": rake.loc,
      "ic": rake.ic,
      "fc": rake.fc
      // "name": null, // If needed, add this (schema has it, but code doesn't extract it)
    }));

    function dedupeBatch(batch, key = "rake_id") {
      const seen = new Set();
      return batch.filter(item => {
        if (seen.has(item[key])) return false;
        seen.add(item[key]);
        return true;
      });
    }

    // Insert in batches (Supabase has a limit per request)
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const uniqueBatch = dedupeBatch(batch);

      const { data, error } = await supabase
        .from(tableName)
        .upsert(uniqueBatch, { onConflict: ['rake_id'] });

      if (error) {
        console.error(`Insert error for table ${tableName}:`, error.message, error.details || "");
      } else {
        console.log(`Inserted ${batch.length} into ${tableName}`);
      }

      insertedCount += batch.length;
    }


    // console.log(`Inserted ${insertedCount} rakes into ${tableName}`);
    return insertedCount;

  } catch (error) {
    // console.error(`Error updating ${tableName}:`, error);
    // throw new Error(`Database update failed for ${tableName}`);
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