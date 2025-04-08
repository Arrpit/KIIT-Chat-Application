import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import jwtDecode from 'jwt-decode'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        if (decoded.exp * 1000 > Date.now()) {
          setCurrentUser(decoded)
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        } else {
          localStorage.removeItem('token')
        }
      } catch (error) {
        console.error('Token validation error:', error)
        localStorage.removeItem('token')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email)
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5012'
      console.log('Using server URL:', serverUrl)
      
      // Set a timeout for the request
      const response = await axios.post(`${serverUrl}/api/auth/login`, 
        { email, password },
        { timeout: 10000 } // 10 second timeout
      )
      
      console.log('Login response received')
      const { token } = response.data
      localStorage.setItem('token', token)
      
      const decoded = jwtDecode(token)
      console.log('User authenticated:', decoded.id, decoded.email)
      
      setCurrentUser(decoded)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      navigate('/')
      return response.data
    } catch (error) {
      console.error('Login error details:', error)
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        console.error('Server error response:', error.response.status, error.response.data)
        throw { message: error.response.data.message || 'Failed to login' }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server')
        throw { message: 'No response from server. Please try again later.' }
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message)
        throw { message: error.message || 'Failed to login' }
      }
    }
  }

  const register = async (userData) => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5012'
      const response = await axios.post(`${serverUrl}/api/auth/register`, userData)
      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      if (error.response) {
        throw { message: error.response.data.message || 'Failed to create account' }
      } else if (error.request) {
        throw { message: 'No response from server. Please try again later.' }
      } else {
        throw { message: error.message || 'Failed to create account' }
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setCurrentUser(null)
    navigate('/login')
  }

  const value = {
    currentUser,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}