import React, { useRef, useState } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useAuth } from '../contexts/authContext'
import { Link, useNavigate } from "react-router-dom"
import { Container } from 'react-bootstrap'
import "bootstrap/dist/css/bootstrap.min.css"

export default function Signup() {
  const emailRef = useRef()
  const passwordRef = useRef()
  const passwordConfRef = useRef()
  const {signup} = useAuth()
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()

    if (passwordRef.current.value !== 
      passwordConfRef.current.value)
      {
        return setError('Passwords do not match!')
      }
    
    if (passwordRef.current.value.length < 6)
    {
      return setError('Password should be at least 6 characters')
    }

    try{
      setError('')
      await signup(emailRef.current.value, passwordRef.current.value)
      navigate('/')
    } catch (err) {
      setError('Failed to create an account')
    }

  }

  return (
    <Container 
        className="d-flex align-items-center justify-content-center" 
        style={{minHeight: "100vh"}}
    >
      <div className="w-100" style={{maxWidth: "400px"}}>
      <Card style={{padding: "20px"}}>
        <h2 className="text-center mb-4">Sign Up</h2>
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
            <Form.Group id="password-confirm">
                <Form.Label>Confirm password</Form.Label>
                <Form.Control type="password" ref={passwordConfRef} required />
            </Form.Group>
            <Button className="w-100" type="submit" style={{marginTop: "20px"}}>
                Sign Up
            </Button>
        </Form>
      </Card>
      <div className="w-100 text-center mt-2">
        Already have an account? <Link to="/login">Log In</Link>
      </div>
    </div>
    </Container>
  )
}
