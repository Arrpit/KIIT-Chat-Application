import { useState, useEffect, useRef } from 'react'
import { Box, Paper, TextField, IconButton, Typography, List, ListItem, ListItemText, Avatar, Grid, Divider, InputAdornment, AppBar, Toolbar } from '@mui/material'
import { Send as SendIcon, Search as SearchIcon } from '@mui/icons-material'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

function Chat() {
  const [message, setMessage] = useState('')
  const [users, setUsers] = useState([])
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const { currentUser } = useAuth()
  const { socket, messages, sendMessage } = useSocket()
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (socket) {
      socket.on('users', (connectedUsers) => {
        setUsers(connectedUsers.filter(user => user.id !== currentUser.id))
      })

      return () => {
        socket.off('users')
      }
    }
  }, [socket, currentUser])

  const searchUsers = async () => {
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5012'
      const response = await fetch(`${serverUrl}/api/users/search?email=${searchEmail}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  useEffect(() => {
    if (searchEmail) {
      const debounceSearch = setTimeout(() => {
        searchUsers();
      }, 500);
      return () => clearTimeout(debounceSearch);
    } else {
      setSearchResults([]);
    }
  }, [searchEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (message.trim() && selectedUser) {
      sendMessage(message, selectedUser.id)
      setMessage('')
    }
  }

  const filteredMessages = messages.filter(
    msg =>
      (msg.senderId === currentUser.id && msg.recipientId === selectedUser?.id) ||
      (msg.senderId === selectedUser?.id && msg.recipientId === currentUser.id)
  )

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" sx={{ backgroundColor: '#4FC3F7' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Logo width="50px" height="50px" />
            <Typography variant="h6" component="div" sx={{ ml: 2 }}>
              Online Chat
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Grid container spacing={2} sx={{ height: 'calc(100vh - 64px)', p: 2, flexGrow: 1 }}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ height: '100%', overflow: 'auto' }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            Users
          </Typography>
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <List>
            {searchEmail ? searchResults.map((user) => (
              <ListItem
                button
                key={user._id}
                selected={selectedUser?._id === user._id}
                onClick={() => setSelectedUser(user)}
              >
                <Avatar sx={{ mr: 2 }}>{user.name[0]}</Avatar>
                <ListItemText 
                  primary={user.name}
                  secondary={user.email}
                />
              </ListItem>
            )) : users.map((user) => (
              <ListItem
                button
                key={user.id}
                selected={selectedUser?.id === user.id}
                onClick={() => setSelectedUser(user)}
              >
                <Avatar sx={{ mr: 2 }}>{user.name[0]}</Avatar>
                <ListItemText primary={user.name} />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              {selectedUser ? `Chat with ${selectedUser.name}` : 'Select a user to start chatting'}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            {selectedUser ? (
              filteredMessages.map((msg, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.senderId === currentUser.id ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      bgcolor: msg.senderId === currentUser.id ? 'primary.main' : 'grey.200',
                      color: msg.senderId === currentUser.id ? 'white' : 'text.primary',
                      maxWidth: '70%'
                    }}
                  >
                    <Typography>{msg.content}</Typography>
                  </Paper>
                </Box>
              ))
            ) : (
              <Typography align="center" color="textSecondary">
                Select a user to start chatting
              </Typography>
            )}
            <div ref={messagesEndRef} />
          </Box>
          {selectedUser && (
            <Box
              component="form"
              onSubmit={handleSend}
              sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}
            >
              <Grid container spacing={2}>
                <Grid item xs>
                  <TextField
                    fullWidth
                    placeholder="Type a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </Grid>
                <Grid item>
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={!message.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
    </Box>
  )
}

export default Chat