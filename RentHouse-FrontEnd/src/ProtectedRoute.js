import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const role = localStorage.getItem('userRole'); // or get from context

  if (role !== 'ADMIN') {
    // Not authorized, redirect to home or show message
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
