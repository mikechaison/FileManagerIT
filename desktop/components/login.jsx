import React, { useRef, useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useAuth } from '../contexts/authContext'
import { Link, useNavigate } from "react-router-dom"
import { Container } from 'react-bootstrap'
import "bootstrap/dist/css/bootstrap.min.css"

export default function Login() {
    const emailRef = useRef()
    const passwordRef = useRef()
    const {login} = useAuth()
    const [error, setError] = useState('')
    const navigate = useNavigate()
  
    async function handleSubmit(e) {
      e.preventDefault()
  
      try{
        setError('')
        await login(emailRef.current.value, passwordRef.current.value)
        navigate('/')
      } catch (err) {
        setError('Failed to log in')
      }
  
    }
  
    return (
      <Container 
          className="d-flex align-items-center justify-content-center" 
          style={{minHeight: "100vh"}}
      >
        <div className="w-100" style={{maxWidth: "400px"}}>
        <Card style={{padding: "20px"}}>
          <h2 className="text-center mb-4">Log In</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
              <Form.Group id="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" ref={emailRef} required />
              </Form.Group>
              <Form.Group id="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" ref={passwordRef} required />
              </Form.Group>
              <Button className="w-100" type="submit" style={{marginTop: "20px"}}>
                  Log In
              </Button>
          </Form>
        </Card>
        <div className="w-100 text-center mt-2">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </div>
      </div>
      </Container>
    )
}
