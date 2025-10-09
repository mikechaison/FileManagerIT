import React from "react"
import Signup from "./signup"
import Dashboard from "./dashboard"
import Login from "./login"
import PrivateRoute from "./privateRoute"
import { AuthProvider } from "../contexts/authContext"
import { BrowserRouter, Routes, Route } from "react-router-dom"

function App()
{
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route element={<PrivateRoute />}>
                        <Route path="/" element={<Dashboard />} />
                    </Route>
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}
export default App