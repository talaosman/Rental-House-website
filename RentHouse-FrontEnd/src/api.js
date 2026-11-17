// src/api.js
import "./mock/mockBackend"; // must load first: installs the demo (seeded) backend
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000",
});

export default API;