import React, { useState, useRef, useEffect } from "react";
import "./CountryCodePicker.css";

const COUNTRIES = [
  { code: "+1",   flag: "🇺🇸", name: "United States",   iso: "US" },
  { code: "+1",   flag: "🇨🇦", name: "Canada",           iso: "CA" },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom",   iso: "GB" },
  { code: "+33",  flag: "🇫🇷", name: "France",           iso: "FR" },
  { code: "+49",  flag: "🇩🇪", name: "Germany",          iso: "DE" },
  { code: "+39",  flag: "🇮🇹", name: "Italy",            iso: "IT" },
  { code: "+34",  flag: "🇪🇸", name: "Spain",            iso: "ES" },
  { code: "+961", flag: "🇱🇧", name: "Lebanon",          iso: "LB" },
  { code: "+971", flag: "🇦🇪", name: "UAE",              iso: "AE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia",     iso: "SA" },
  { code: "+962", flag: "🇯🇴", name: "Jordan",           iso: "JO" },
  { code: "+963", flag: "🇸🇾", name: "Syria",            iso: "SY" },
  { code: "+20",  flag: "🇪🇬", name: "Egypt",            iso: "EG" },
  { code: "+212", flag: "🇲🇦", name: "Morocco",          iso: "MA" },
  { code: "+90",  flag: "🇹🇷", name: "Turkey",           iso: "TR" },
  { code: "+91",  flag: "🇮🇳", name: "India",            iso: "IN" },
  { code: "+86",  flag: "🇨🇳", name: "China",            iso: "CN" },
  { code: "+81",  flag: "🇯🇵", name: "Japan",            iso: "JP" },
  { code: "+82",  flag: "🇰🇷", name: "South Korea",      iso: "KR" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil",           iso: "BR" },
  { code: "+52",  flag: "🇲🇽", name: "Mexico",           iso: "MX" },
  { code: "+61",  flag: "🇦🇺", name: "Australia",        iso: "AU" },
  { code: "+7",   flag: "🇷🇺", name: "Russia",           iso: "RU" },
  { code: "+31",  flag: "🇳🇱", name: "Netherlands",      iso: "NL" },
  { code: "+46",  flag: "🇸🇪", name: "Sweden",           iso: "SE" },
  { code: "+47",  flag: "🇳🇴", name: "Norway",           iso: "NO" },
  { code: "+45",  flag: "🇩🇰", name: "Denmark",          iso: "DK" },
  { code: "+41",  flag: "🇨🇭", name: "Switzerland",      iso: "CH" },
  { code: "+32",  flag: "🇧🇪", name: "Belgium",          iso: "BE" },
  { code: "+351", flag: "🇵🇹", name: "Portugal",         iso: "PT" },
  { code: "+30",  flag: "🇬🇷", name: "Greece",           iso: "GR" },
  { code: "+48",  flag: "🇵🇱", name: "Poland",           iso: "PL" },
];

const CountryCodePicker = ({ value, onChange, disabled }) => {
  // value is the dial code string e.g. "+961"
  // Find the selected country (default to Lebanon if not found)
  const selected = COUNTRIES.find(
    (c) => c.code === value && c.iso === (
      // prefer exact match by stored iso if available
      COUNTRIES.find(x => x.code === value)?.iso
    )
  ) || COUNTRIES.find((c) => c.code === value) || COUNTRIES[7]; // fallback LB

  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const wrapRef               = useRef(null);
  const searchRef             = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = query.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.includes(query) ||
          c.iso.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRIES;

  const handleSelect = (country) => {
    onChange(country.code, country.iso);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`ccp-wrap ${open ? "ccp-open" : ""}`} ref={wrapRef}>
      {/* Trigger */}
      <button
        type="button"
        className="ccp-trigger"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ccp-flag">{selected.flag}</span>
        <span className="ccp-code">{selected.code}</span>
        <svg
          className={`ccp-chevron ${open ? "ccp-chevron--open" : ""}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="ccp-dropdown" role="listbox">
          {/* Search */}
          <div className="ccp-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" className="ccp-search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              className="ccp-search"
              type="text"
              placeholder="Search country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Options */}
          <ul className="ccp-list">
            {filtered.length === 0 ? (
              <li className="ccp-no-results">No results</li>
            ) : (
              filtered.map((c) => (
                <li
                  key={`${c.iso}-${c.code}`}
                  className={`ccp-option ${selected.iso === c.iso && selected.code === c.code ? "ccp-option--selected" : ""}`}
                  onClick={() => handleSelect(c)}
                  role="option"
                  aria-selected={selected.iso === c.iso}
                >
                  <span className="ccp-option-flag">{c.flag}</span>
                  <span className="ccp-option-name">{c.name}</span>
                  <span className="ccp-option-code">{c.code}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CountryCodePicker;
export { COUNTRIES };