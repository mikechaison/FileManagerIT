import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/authContext'

function PrivateRoute() {
  const { currentUser } = useAuth(); 
  if (!currentUser) {
    return <Navigate to="/login" replace />; 
  }

  return <Outlet />;
}

export default PrivateRoute;