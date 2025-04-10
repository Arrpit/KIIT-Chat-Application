import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import CryptoJS from 'crypto-js'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const { currentUser } = useAuth()

  useEffect(() => {
    if (currentUser) {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5012'
      console.log('Attempting to connect to server:', serverUrl)
      console.log('Current user:', currentUser.id, currentUser.email)
      
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }
      
      const newSocket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000 // Increase timeout to 10 seconds
      })

      newSocket.on('connect', () => {
        console.log('Connected to WebSocket server with ID:', newSocket.id)
        // Request existing messages when connected
        newSocket.emit('get_messages')
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message || error)
      })

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason)
      })

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected to WebSocket server after', attemptNumber, 'attempts')
        // Re-fetch messages after reconnection
        newSocket.emit('get_messages')
      })

      newSocket.on('message', (message) => {
        try {
          const bytes = CryptoJS.AES.decrypt(
            message.content,
            import.meta.env.VITE_MESSAGE_SECRET || 'default-secret-key'
          )
          const decryptedMessage = bytes.toString(CryptoJS.enc.Utf8)
          
          setMessages(prev => {
            // Check if message already exists by ID
            if (prev.some(msg => msg._id === message._id)) {
              return prev
            }

            // Find if we have a temporary message to replace
            const tempMessageIndex = prev.findIndex(msg => 
              msg.senderId === message.senderId && 
              msg.recipientId === message.recipientId && 
              msg.content === decryptedMessage && 
              msg._id.toString().includes('temp-') // Check for temporary messages
            )

            if (tempMessageIndex !== -1) {
              // Replace temporary message with server-confirmed message
              const newMessages = [...prev]
              newMessages[tempMessageIndex] = {
                ...message,
                content: decryptedMessage
              }
              return newMessages
            }

            // Add as new message
            return [...prev, {
              ...message,
              content: decryptedMessage
            }]
          })
        } catch (error) {
          console.error('Message decryption error:', error)
        }
      })

      newSocket.on('error', (error) => {
        console.error('Socket error:', error)
      })

      // Handle existing messages
      newSocket.on('existing_messages', (messages) => {
        const decryptedMessages = messages.map(msg => {
          try {
            const bytes = CryptoJS.AES.decrypt(
              msg.content,
              import.meta.env.VITE_MESSAGE_SECRET || 'default-secret-key'
            )
            return {
              ...msg,
              content: bytes.toString(CryptoJS.enc.Utf8)
            }
          } catch (error) {
            console.error('Message decryption error:', error)
            return null
          }
        }).filter(Boolean)
        // Sort messages by timestamp
        decryptedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        setMessages(decryptedMessages)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [currentUser])

  const sendMessage = (content, recipientId) => {
    if (socket) {
      try {
        const encryptedContent = CryptoJS.AES.encrypt(
          content,
          import.meta.env.VITE_MESSAGE_SECRET || 'default-secret-key'
        ).toString()

        // Create a temporary message object for immediate UI update
        const tempMessage = {
          content: content, // Store unencrypted content for UI
          senderId: currentUser.id,
          recipientId,
          timestamp: new Date(),
          _id: `temp-${Date.now()}` // Temporary ID with prefix
        }

        // Update UI immediately
        setMessages(prev => [...prev, tempMessage])

        // Emit message to server
        socket.emit('message', {
          content: encryptedContent,
          recipientId,
          senderId: currentUser.id
        })
      } catch (error) {
        console.error('Message encryption error:', error)
      }
    }
  }

  const value = {
    socket,
    messages,
    sendMessage
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}