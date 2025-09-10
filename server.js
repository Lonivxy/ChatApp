const WebSocket = require("ws")
const http = require("http")
const fs = require("fs")
const path = require("path")

// Create HTTP server for serving static files
const server = http.createServer((req, res) => {
  // Simple static file server
  let filePath = "." + req.url
  if (filePath === "./") {
    filePath = "./index.html"
  }

  const extname = String(path.extname(filePath)).toLowerCase()
  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "application/font-woff",
    ".ttf": "application/font-ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".otf": "application/font-otf",
    ".wasm": "application/wasm",
  }

  const contentType = mimeTypes[extname] || "application/octet-stream"

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" })
        res.end("<h1>404 Not Found</h1>", "utf-8")
      } else {
        res.writeHead(500)
        res.end(`Server Error: ${error.code}`, "utf-8")
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType })
      res.end(content, "utf-8")
    }
  })
})

// Create WebSocket server
const wss = new WebSocket.Server({ server })

// Store rooms and users
const rooms = new Map()
const userConnections = new Map()

// Get local IP address
function getLocalIP() {
  const { networkInterfaces } = require("os")
  const nets = networkInterfaces()

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address
      }
    }
  }
  return "localhost"
}

wss.on("connection", (ws, req) => {
  console.log("New client connected from:", req.socket.remoteAddress)

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message)

      switch (data.type) {
        case "join_room":
          handleJoinRoom(ws, data)
          break
        case "leave_room":
          handleLeaveRoom(ws, data)
          break
        case "send_message":
          handleSendMessage(ws, data)
          break
        case "update_presence":
          handleUpdatePresence(ws, data)
          break
        case "get_room_data":
          handleGetRoomData(ws, data)
          break
      }
    } catch (error) {
      console.error("Error parsing message:", error)
    }
  })

  ws.on("close", () => {
    console.log("Client disconnected")
    // Clean up user from all rooms
    for (const [roomId, room] of rooms.entries()) {
      room.users = room.users.filter((user) => user.connectionId !== ws.connectionId)
      broadcastToRoom(roomId, {
        type: "room_update",
        room: room,
      })
    }
  })

  // Assign connection ID
  ws.connectionId = Math.random().toString(36).substring(7)
})

function handleJoinRoom(ws, data) {
  const { roomId, user } = data

  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      messages: [],
      users: [],
    })
  }

  const room = rooms.get(roomId)

  // Add user to room
  const userWithConnection = {
    ...user,
    connectionId: ws.connectionId,
    lastSeen: new Date().toISOString(),
    isOnline: true,
  }

  // Remove existing user if reconnecting
  room.users = room.users.filter((u) => u.id !== user.id)
  room.users.push(userWithConnection)

  // Store user connection
  userConnections.set(ws.connectionId, { ws, roomId, userId: user.id })

  // Send room data to user
  ws.send(
    JSON.stringify({
      type: "room_joined",
      room: room,
    }),
  )

  // Broadcast user joined to others
  broadcastToRoom(
    roomId,
    {
      type: "user_joined",
      user: userWithConnection,
    },
    ws.connectionId,
  )

  console.log(`User ${user.name} joined room ${roomId}`)
}

function handleLeaveRoom(ws, data) {
  const userConnection = userConnections.get(ws.connectionId)
  if (!userConnection) return

  const { roomId, userId } = userConnection
  const room = rooms.get(roomId)

  if (room) {
    room.users = room.users.filter((u) => u.id !== userId)

    broadcastToRoom(roomId, {
      type: "user_left",
      userId: userId,
    })
  }

  userConnections.delete(ws.connectionId)
  console.log(`User left room ${roomId}`)
}

function handleSendMessage(ws, data) {
  const { roomId, message } = data
  const room = rooms.get(roomId)

  if (!room) return

  // Add message to room
  room.messages.push(message)

  // Keep only last 100 messages
  if (room.messages.length > 100) {
    room.messages = room.messages.slice(-100)
  }

  // Broadcast message to all users in room
  broadcastToRoom(roomId, {
    type: "new_message",
    message: message,
  })

  console.log(`Message sent in room ${roomId}: ${message.text}`)
}

function handleUpdatePresence(ws, data) {
  const { roomId, user } = data
  const room = rooms.get(roomId)

  if (!room) return

  // Update user presence
  const userIndex = room.users.findIndex((u) => u.id === user.id)
  if (userIndex >= 0) {
    room.users[userIndex] = {
      ...room.users[userIndex],
      ...user,
      lastSeen: new Date().toISOString(),
      isOnline: true,
    }

    broadcastToRoom(roomId, {
      type: "presence_update",
      user: room.users[userIndex],
    })
  }
}

function handleGetRoomData(ws, data) {
  const { roomId } = data
  const room = rooms.get(roomId)

  if (room) {
    ws.send(
      JSON.stringify({
        type: "room_data",
        room: room,
      }),
    )
  }
}

function broadcastToRoom(roomId, message, excludeConnectionId = null) {
  const room = rooms.get(roomId)
  if (!room) return

  room.users.forEach((user) => {
    if (user.connectionId !== excludeConnectionId) {
      for (const [connectionId, connection] of userConnections.entries()) {
        if (connectionId === user.connectionId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify(message))
        }
      }
    }
  })
}

const PORT = process.env.PORT || 3001
const LOCAL_IP = getLocalIP()

server.listen(PORT, "0.0.0.0", () => {
  console.log("🌐 Chat Server Started!")
  console.log("")
  console.log("📱 Access from this computer:")
  console.log(`   http://localhost:${PORT}`)
  console.log("")
  console.log("🌍 Access from other devices on your network:")
  console.log(`   http://${LOCAL_IP}:${PORT}`)
  console.log("")
  console.log("💡 Share the network URL with friends to chat!")
  console.log("")
  console.log("Press Ctrl+C to stop the server")
})
