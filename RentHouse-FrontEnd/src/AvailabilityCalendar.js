import React, { useState, useEffect, useMemo } from "react";
import "./AvailabilityCalendar.css";

/**
 * AvailabilityCalendar
 *
 * Props:
 *   houseId  — the property ID to fetch rents for
 *   compact  — boolean, renders a smaller inline version (default false)
 *
 * Usage in PropertyDetails.jsx, inside the booking section:
 *   import AvailabilityCalendar from "./AvailabilityCalendar";
 *   ...
 *   <AvailabilityCalendar houseId={id} />
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Parse any date format from backend into a plain "YYYY-MM-DD" string
const normalizeDate = (raw) => {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const [y, m, d] = raw;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return String(raw).slice(0, 10);
};

// Build a Set of all "YYYY-MM-DD" strings that are booked
const buildBookedSet = (rents) => {
  const set = new Set();
  rents.forEach((rent) => {
    const start = normalizeDate(rent.startDate);
    const end   = normalizeDate(rent.endDate);
    if (!start || !end) return;

    let cur = new Date(start + "T12:00:00");
    const last = new Date(end + "T12:00:00");
    while (cur <= last) {
      set.add(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  });
  return set;
};

// Returns first day-of-week (0=Sun) and total days in month
const monthMeta = (year, month) => ({
  firstDay: new Date(year, month, 1).getDay(),
  daysInMonth: new Date(year, month + 1, 0).getDate(),
});

const AvailabilityCalendar = ({ houseId, compact = false }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [rents,     setRents]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);

  // Fetch all rents for this house once
  useEffect(() => {
    if (!houseId) return;
    setLoading(true);
    setError(false);
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/rents/house/${houseId}`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        setRents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [houseId]);

  const bookedSet = useMemo(() => buildBookedSet(rents), [rents]);

  const todayStr = today.toISOString().slice(0, 10);

  const { firstDay, daysInMonth } = monthMeta(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  // Can we go back? Don't allow going before current month
  const canGoBack = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  // Build grid cells: leading nulls + day numbers
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getDayStatus = (day) => {
    if (!day) return "empty";
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (str < todayStr) return "past";
    if (bookedSet.has(str)) return "booked";
    return "available";
  };

  // Count stats for legend
  const monthStats = useMemo(() => {
    let avail = 0, booked = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const s = getDayStatus(d);
      if (s === "available") avail++;
      else if (s === "booked") booked++;
    }
    return { avail, booked };
  }, [viewYear, viewMonth, bookedSet, daysInMonth, todayStr]);

  return (
    <div className={`avail-cal ${compact ? "avail-cal--compact" : ""}`}>

      {/* Header */}
      <div className="avail-cal__header">
        <div className="avail-cal__title-row">
          <span className="avail-cal__eyebrow">Availability</span>
          <h3 className="avail-cal__month-label">
            {MONTHS[viewMonth]} {viewYear}
          </h3>
        </div>

        <div className="avail-cal__nav">
          <button
            className="avail-cal__nav-btn"
            onClick={prevMonth}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="avail-cal__nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className="avail-cal__stats">
          <div className="avail-cal__stat avail-cal__stat--available">
            <span className="avail-cal__stat-dot" />
            <span className="avail-cal__stat-num">{monthStats.avail}</span>
            <span className="avail-cal__stat-label">available</span>
          </div>
          <div className="avail-cal__stat avail-cal__stat--booked">
            <span className="avail-cal__stat-dot" />
            <span className="avail-cal__stat-num">{monthStats.booked}</span>
            <span className="avail-cal__stat-label">booked</span>
          </div>
        </div>
      )}

      {/* Day-of-week headers */}
      <div className="avail-cal__grid avail-cal__grid--head">
        {DAYS.map((d) => (
          <div key={d} className="avail-cal__day-name">{d}</div>
        ))}
      </div>

      {/* Calendar body */}
      {loading ? (
        <div className="avail-cal__loading">
          <div className="avail-cal__spinner" />
          <span>Loading calendar…</span>
        </div>
      ) : error ? (
        <div className="avail-cal__error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Could not load availability</span>
        </div>
      ) : (
        <div className="avail-cal__grid avail-cal__grid--body">
          {cells.map((day, idx) => {
            const status = getDayStatus(day);
            const isToday =
              day &&
              viewYear === today.getFullYear() &&
              viewMonth === today.getMonth() &&
              day === today.getDate();

            return (
              <div
                key={idx}
                className={[
                  "avail-cal__cell",
                  day ? `avail-cal__cell--${status}` : "avail-cal__cell--empty",
                  isToday ? "avail-cal__cell--today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  day
                    ? `${MONTHS[viewMonth]} ${day}: ${status}`
                    : undefined
                }
              >
                {day && <span className="avail-cal__day-num">{day}</span>}
                {isToday && <span className="avail-cal__today-dot" />}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="avail-cal__legend">
        <div className="avail-cal__legend-item">
          <span className="avail-cal__legend-swatch avail-cal__legend-swatch--available" />
          Available
        </div>
        <div className="avail-cal__legend-item">
          <span className="avail-cal__legend-swatch avail-cal__legend-swatch--booked" />
          Booked
        </div>
        <div className="avail-cal__legend-item">
          <span className="avail-cal__legend-swatch avail-cal__legend-swatch--past" />
          Past
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;