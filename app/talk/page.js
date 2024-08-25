'use client';
import { useState, useEffect } from 'react';
import { Box, Stack, TextField, Button, Avatar, Switch, Typography } from '@mui/material';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Prof Buzz, How can I help you today?"
    }
  ]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false); // State to handle typing indicator
  const [darkMode, setDarkMode] = useState(true); // State to manage dark mode

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const sendMessage = async () => {
    if (message.trim() === "") return; // Prevent sending empty messages
    console.log(message)

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' }
    ]);

    setMessage("");
    setIsTyping(true); // Show typing indicator

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      }).then(async (res) => {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let result = ''
    
        return reader.read().then(function processText({done, value}) {
          if (done) {
            setIsTyping(false)
            return result
          }
          const text = decoder.decode(value || new Uint8Array(), {stream: true})
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1]
            let otherMessages = messages.slice(0, messages.length - 1)
            return [
              ...otherMessages,
              {...lastMessage, content: lastMessage.content + text},
            ]
          })
          return reader.read()
        })
      })
    } catch (error) {
      setIsTyping(false); // Hide typing indicator in case of error
      console.error('Error fetching chat response:', error);
    }
  };


  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor={darkMode ? '#0D1116' : '#46F1D5'} // Background color toggles with dark mode
    >
      {/* Light/Dark Mode Toggle */}
      <Box sx={{ position: 'absolute', top: 16, right: 150 }}> {/* Adjusted right to 80px */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ color: darkMode ? '#FDFFFF' : '#0D1116' }}>Light</Typography>
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            color="default"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#FFEB00', // Ball color when checked
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#FFEB00', // Track color when checked
              },
              '& .MuiSwitch-track': {
                backgroundColor: '#0D1116', // Track color when unchecked
              },
            }}
          />
          <Typography sx={{ color: darkMode ? '#FDFFFF' : '#0D1116' }}>Dark</Typography>
        </Stack>
      </Box>

      {/* Left Border */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '80px', // Adjust the width of the border as needed
          backgroundColor: darkMode ? '#46F1D5' : '#0D1116', // Toggle border color
        }}
      />

      {/* Right Border */}
      <Box
        sx={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '80px', // Adjust the width of the border as needed
          backgroundColor: darkMode ? '#46F1D5' : '#0D1116', // Toggle border color
        }}
      />

      <Stack
        direction="column"
        width="500px"
        height="590px"  // Reduced height for the chat box
        border={`1px solid ${darkMode ? '#0D1116' : '#46F1D5'}`} // Border color toggles with dark mode
        borderRadius={2}
        boxShadow={3}
        padding={2}
        spacing={3}
        bgcolor={darkMode ? '#46F1D5' : '#FDFFFF'} // Background color of the chat box toggles
      >
        <Stack direction="column" spacing={2} flexGrow={1} overflow="auto" maxHeight="100%">
          {messages.map((msg, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={msg.role === 'assistant' ? 'flex-start' : 'flex-end'}
              mb={1}
            >
              {msg.role === 'assistant' && (
                <Avatar 
                  alt="Assistant" 
                  src="/ProfBuzzLogo.png" 
                  sx={{
                    width: 50, // Width of the avatar
                    height: 50, // Height of the avatar
                    borderRadius: 0, // Set border-radius to 0 to make it fully square
                  }} 
                />
              )}
              <Box
                bgcolor={msg.role === 'assistant' ? '#0D1116' : '#FFEB00'} // Black for assistant, Yellow for user
                color={msg.role === 'assistant' ? "#FDFFFF" : "#0D1116"} // Text color set to White or Black
                p={2}
                borderRadius={2}
                maxWidth="70%"
                fontFamily={'Open Sans'}
                fontSize={'18px'}
                ml={msg.role === 'assistant' ? 2 : 0} // Add margin between avatar and message
              >
                {msg.content}
              </Box>
            </Box>
          ))}
          {isTyping && (
            <Box
              display="flex"
              justifyContent="flex-start"
              mb={1}
            >
              <Box
                bgcolor="#0D1116"
                color="#FDFFFF"
                p={1} // Reduce padding to make the box smaller
                borderRadius={2}
                maxWidth="50%" // Reduce maxWidth to make the box narrower
                fontFamily={'Open Sans'}
                fontSize={'14px'} // Reduce font size for the "Typing..." text
                ml={8} // Add margin to align with where the avatar would be
              >
                Typing...
              </Box>
            </Box>
          )}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Type your message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
              }
            }}
            sx={{
              bgcolor: '#FDFFFF', // Background color of the text field set to White
              borderColor: '#0D1116', // Border color set to Black
            }}
            InputLabelProps={{
              style: { color: '#0D1116' } // Change label color to yellowish color
            }}
          />

          <Button
            variant="contained"
            sx={{
              bgcolor: '#FFEB00', // Button background color set to Yellow
              color: '#0D1116', // Button text color set to Black
              '&:hover': {
                bgcolor: '#E0C200', // Darker Yellow color on hover
              },
              '&:focus': {
                bgcolor: '#E0C200', // Maintain darker Yellow color on focus
              },
              '&:disabled': {
                bgcolor: '#FFEB00', // Maintain Yellow color even when disabled
                color: '#0D1116', // Maintain text color when disabled
              },
            }}
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
