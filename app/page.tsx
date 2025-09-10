"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Paperclip, Settings, Users, MessageCircle, Edit, Palette, Paintbrush, Copy, Share2 } from "lucide-react"

interface Message {
  id: string
  text: string
  sender: string
  timestamp: Date
  type: "text" | "file"
  fileName?: string
  fileUrl?: string
  chatType: "main" | "dm"
  dmRecipient?: string // For DM messages, who it's sent to
}

interface User {
  id: string
  name: string
  ip: string
  color: string
  isOnline: boolean
  lastSeen?: string
}

interface Theme {
  name: string
  primary: string
  secondary: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  sidebar: string
  sidebarForeground: string
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tempUserName, setTempUserName] = useState("")
  const [tempUserColor, setTempUserColor] = useState("#ea580c")
  const [currentTheme, setCurrentTheme] = useState<Theme>({
    name: "Orange",
    primary: "#ea580c",
    secondary: "#f97316",
    background: "#ffffff",
    foreground: "#4b5563",
    card: "#fffbeb",
    cardForeground: "#4b5563",
    sidebar: "#ffffff",
    sidebarForeground: "#4b5563",
  })
  const [tempTheme, setTempTheme] = useState<Theme>(currentTheme)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [roomCode, setRoomCode] = useState("")
  const [isJoined, setIsJoined] = useState(false)
  const [tempRoomCode, setTempRoomCode] = useState("")
  const [chatType, setChatType] = useState<"main" | "dm">("main")
  const [selectedDmUser, setSelectedDmUser] = useState<string | null>(null)
  const [dmConversations, setDmConversations] = useState<string[]>([])

  const STORAGE_KEY_PREFIX = "v0-chat-room-"

  const sendToStorage = async (roomId: string, data: any) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${roomId}`
      localStorage.setItem(
        key,
        JSON.stringify({
          ...data,
          lastUpdated: Date.now(),
        }),
      )
      console.log("[v0] Data saved to room:", roomId)
      return { success: true }
    } catch (error) {
      console.log("[v0] Storage error:", error)
      throw error
    }
  }

  const fetchFromStorage = async (roomId: string) => {
    try {
      const key = `${STORAGE_KEY_PREFIX}${roomId}`
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        console.log("[v0] Data fetched from room:", roomId)
        return parsed
      }
      return null
    } catch (error) {
      console.log("[v0] Storage fetch error:", error)
      return null
    }
  }

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const joinRoom = (code: string) => {
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length >= 4) {
      setRoomCode(cleanCode)
      setIsJoined(true)
      localStorage.setItem("currentRoom", cleanCode)
      console.log("[v0] Joined room:", cleanCode)
    }
  }

  const createRoom = () => {
    const newCode = generateRoomCode()
    joinRoom(newCode)
  }

  const leaveRoom = () => {
    setRoomCode("")
    setIsJoined(false)
    setMessages([])
    setUsers([])
    localStorage.removeItem("currentRoom")
    console.log("[v0] Left room")
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode)
    console.log("[v0] Room code copied:", roomCode)
  }

  const CHAT_ROOM_ID = "v0-chat-room-general"
  const API_BASE = "https://api.jsonbin.io/v3/b"
  const BIN_ID = "67df2a8bad19ca34f8c8e5a1" // Public bin for demo

  const colorOptions = [
    "#ea580c", // Orange
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#f97316", // Orange variant
    "#84cc16", // Lime
    "#ec4899", // Pink
  ]

  const themePresets: Theme[] = [
    {
      name: "Orange",
      primary: "#ea580c",
      secondary: "#f97316",
      background: "#ffffff",
      foreground: "#4b5563",
      card: "#fffbeb",
      cardForeground: "#4b5563",
      sidebar: "#ffffff",
      sidebarForeground: "#4b5563",
    },
    {
      name: "Blue",
      primary: "#3b82f6",
      secondary: "#60a5fa",
      background: "#ffffff",
      foreground: "#1f2937",
      card: "#eff6ff",
      cardForeground: "#1f2937",
      sidebar: "#f8fafc",
      sidebarForeground: "#1f2937",
    },
    {
      name: "Green",
      primary: "#10b981",
      secondary: "#34d399",
      background: "#ffffff",
      foreground: "#1f2937",
      card: "#ecfdf5",
      cardForeground: "#1f2937",
      sidebar: "#f0fdf4",
      sidebarForeground: "#1f2937",
    },
    {
      name: "Purple",
      primary: "#8b5cf6",
      secondary: "#a78bfa",
      background: "#ffffff",
      foreground: "#1f2937",
      card: "#f5f3ff",
      cardForeground: "#1f2937",
      sidebar: "#faf5ff",
      sidebarForeground: "#1f2937",
    },
    {
      name: "Dark",
      primary: "#f97316",
      secondary: "#fb923c",
      background: "#1f2937",
      foreground: "#f9fafb",
      card: "#374151",
      cardForeground: "#f9fafb",
      sidebar: "#111827",
      sidebarForeground: "#f9fafb",
    },
  ]

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement
    root.style.setProperty("--primary", theme.primary)
    root.style.setProperty("--secondary", theme.secondary)
    root.style.setProperty("--background", theme.background)
    root.style.setProperty("--foreground", theme.foreground)
    root.style.setProperty("--card", theme.card)
    root.style.setProperty("--card-foreground", theme.cardForeground)
    root.style.setProperty("--sidebar", theme.sidebar)
    root.style.setProperty("--sidebar-foreground", theme.sidebarForeground)
    root.style.setProperty("--sidebar-primary", theme.card)
    root.style.setProperty("--sidebar-primary-foreground", theme.cardForeground)
    root.style.setProperty("--sidebar-accent", theme.secondary)
    root.style.setProperty("--sidebar-accent-foreground", theme.background)
  }

  useEffect(() => {
    let messageInterval: NodeJS.Timeout

    const pollData = async () => {
      if (!roomCode) return

      try {
        const data = await fetchFromStorage(roomCode)
        if (data) {
          // Update messages
          if (data.messages && Array.isArray(data.messages)) {
            const sortedMessages = data.messages.sort(
              (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            )
            setMessages(sortedMessages.slice(-100))
          }

          // Update users - remove inactive users (older than 30 seconds)
          if (data.users && Array.isArray(data.users)) {
            const activeUsers = data.users.filter((user: User) => {
              const lastSeen = new Date(user.lastSeen || 0).getTime()
              return Date.now() - lastSeen < 30000
            })
            setUsers(activeUsers)
          }

          console.log("[v0] Synced room data successfully")
        }
        setConnectionStatus("connected")
        setIsConnected(true)
      } catch (error) {
        console.log("[v0] Failed to sync room data:", error)
        setConnectionStatus("disconnected")
        setIsConnected(false)
      }
    }

    if (currentUser && isJoined && roomCode) {
      // Poll every 2 seconds for better real-time feel
      messageInterval = setInterval(pollData, 2000)
      // Initial sync
      pollData()
    }

    return () => {
      if (messageInterval) clearInterval(messageInterval)
    }
  }, [currentUser, isJoined, roomCode])

  useEffect(() => {
    let presenceInterval: NodeJS.Timeout

    const updatePresence = async () => {
      if (!currentUser || !roomCode) return

      try {
        // Get current room data
        const currentData = (await fetchFromStorage(roomCode)) || { messages: [], users: [] }

        // Update current user's presence
        const userWithTimestamp = {
          ...currentUser,
          lastSeen: new Date().toISOString(),
          isOnline: true,
        }

        // Update or add user in the users array
        const updatedUsers = currentData.users || []
        const userIndex = updatedUsers.findIndex((u: User) => u.id === currentUser.id)

        if (userIndex >= 0) {
          updatedUsers[userIndex] = userWithTimestamp
        } else {
          updatedUsers.push(userWithTimestamp)
        }

        // Save updated data
        await sendToStorage(roomCode, {
          ...currentData,
          users: updatedUsers,
        })

        console.log("[v0] Updated user presence in room")
      } catch (error) {
        console.log("[v0] Failed to update presence:", error)
      }
    }

    if (currentUser && isJoined && roomCode) {
      // Update presence every 10 seconds
      presenceInterval = setInterval(updatePresence, 10000)
      updatePresence() // Initial update
    }

    return () => {
      if (presenceInterval) clearInterval(presenceInterval)
    }
  }, [currentUser, isJoined, roomCode])

  useEffect(() => {
    if (!roomCode) {
      // Auto-join a default room or create one
      const defaultRoom = "GENERAL"
      setRoomCode(defaultRoom)

      // Initialize user with IP
      fetch("https://api.ipify.org?format=json")
        .then((response) => response.json())
        .then((data) => {
          const userIP = data.ip
          const newUser = {
            id: Date.now().toString(),
            name: userIP,
            ip: userIP,
            color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
            isOnline: true,
            lastSeen: new Date().toISOString(),
          }
          setCurrentUser(newUser)

          // Save to localStorage
          localStorage.setItem("currentUser", JSON.stringify(newUser))
          localStorage.setItem("roomCode", defaultRoom)

          // Add user to room
          const roomKey = `room_${defaultRoom}`
          const existingData = JSON.parse(localStorage.getItem(roomKey) || '{"users": [], "messages": []}')

          // Update or add user
          const userIndex = existingData.users.findIndex((u: any) => u.ip === userIP)
          if (userIndex >= 0) {
            existingData.users[userIndex] = newUser
          } else {
            existingData.users.push(newUser)
          }

          localStorage.setItem(roomKey, JSON.stringify(existingData))
          setUsers(existingData.users)
          setMessages(existingData.messages)
          setConnectionStatus("connected")
        })
        .catch(() => {
          // Fallback if IP fetch fails
          const fallbackIP = `User_${Math.random().toString(36).substr(2, 6)}`
          const newUser = {
            id: Date.now().toString(),
            name: fallbackIP,
            ip: fallbackIP,
            color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
            isOnline: true,
            lastSeen: new Date().toISOString(),
          }
          setCurrentUser(newUser)
          localStorage.setItem("currentUser", JSON.stringify(newUser))
          localStorage.setItem("roomCode", defaultRoom)
          setConnectionStatus("connected")
        })
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!currentUser || (!currentMessage.trim() && !selectedFile) || !roomCode) return

    console.log("[v0] Sending message to room:", roomCode, currentMessage, "File:", selectedFile?.name)

    const newMessage: Message = {
      id: crypto.randomUUID(),
      text: selectedFile ? `Shared file: ${selectedFile.name}` : currentMessage,
      sender: currentUser.name,
      timestamp: new Date(),
      type: selectedFile ? "file" : "text",
      fileName: selectedFile?.name,
      fileUrl: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
      chatType: chatType,
      dmRecipient: chatType === "dm" ? selectedDmUser : undefined,
    }

    console.log("[v0] Created message:", newMessage)

    try {
      // Get current room data
      const currentData = (await fetchFromStorage(roomCode)) || { messages: [], users: [] }

      // Add new message
      const updatedMessages = [...(currentData.messages || []), newMessage]

      // Keep only last 100 messages
      const trimmedMessages = updatedMessages.slice(-100)

      // Save updated data
      await sendToStorage(roomCode, {
        ...currentData,
        messages: trimmedMessages,
      })

      console.log("[v0] Message sent successfully to room")

      // Update local state immediately for better UX
      setMessages((prev) => {
        const messageExists = prev.some((m) => m.id === newMessage.id)
        if (!messageExists) {
          return [...prev, newMessage]
        }
        return prev
      })

      if (chatType === "dm" && selectedDmUser && !dmConversations.includes(selectedDmUser)) {
        setDmConversations((prev) => [...prev, selectedDmUser])
      }
    } catch (error) {
      console.log("[v0] Failed to send message:", error)
      // Fallback to local state
      setMessages((prev) => [...prev, newMessage])
    }

    setCurrentMessage("")
    setSelectedFile(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: Date) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) {
        console.log("[v0] Invalid date:", date)
        return "Invalid Date"
      }
      return dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (error) {
      console.log("[v0] Date formatting error:", error, date)
      return "??"
    }
  }

  const openSettings = () => {
    if (currentUser) {
      setTempUserName(currentUser.name)
      setTempUserColor(currentUser.color)
      setTempTheme(currentTheme)
      setIsSettingsOpen(true)
    }
  }

  const saveUserSettings = async () => {
    if (!currentUser) return

    const updatedUser = {
      ...currentUser,
      name: tempUserName.trim() || currentUser.ip,
      color: tempUserColor,
      lastSeen: new Date().toISOString(),
    }

    setCurrentUser(updatedUser)
    localStorage.setItem("chatUser", JSON.stringify(updatedUser))

    if (roomCode) {
      try {
        // Get current room data and update user
        const currentData = (await fetchFromStorage(roomCode)) || { messages: [], users: [] }
        const updatedUsers = currentData.users || []
        const userIndex = updatedUsers.findIndex((u: User) => u.id === currentUser.id)

        if (userIndex >= 0) {
          updatedUsers[userIndex] = updatedUser
        } else {
          updatedUsers.push(updatedUser)
        }

        await sendToStorage(roomCode, {
          ...currentData,
          users: updatedUsers,
        })

        console.log("[v0] User settings updated in room")
      } catch (error) {
        console.log("[v0] Failed to update user settings:", error)
      }
    }

    setCurrentTheme(tempTheme)
    localStorage.setItem("chatTheme", JSON.stringify(tempTheme))
    applyTheme(tempTheme)

    setIsSettingsOpen(false)
  }

  const resetToIP = () => {
    if (currentUser) {
      setTempUserName(currentUser.ip)
    }
  }

  const applyPresetTheme = (preset: Theme) => {
    setTempTheme(preset)
  }

  const updateThemeColor = (property: keyof Theme, color: string) => {
    setTempTheme((prev) => ({ ...prev, [property]: color }))
  }

  const startDmWith = (userName: string) => {
    if (userName !== currentUser?.name) {
      setSelectedDmUser(userName)
      setChatType("dm")
      if (!dmConversations.includes(userName)) {
        setDmConversations((prev) => [...prev, userName])
      }
    }
  }

  const getFilteredMessages = () => {
    if (chatType === "main") {
      return messages.filter((msg) => msg.chatType === "main" || !msg.chatType) // Include old messages without chatType
    } else if (chatType === "dm" && selectedDmUser) {
      return messages.filter(
        (msg) =>
          msg.chatType === "dm" &&
          ((msg.sender === currentUser?.name && msg.dmRecipient === selectedDmUser) ||
            (msg.sender === selectedDmUser && msg.dmRecipient === currentUser?.name)),
      )
    }
    return []
  }

  const switchRoom = (newRoomCode: string) => {
    if (newRoomCode && newRoomCode !== roomCode) {
      setRoomCode(newRoomCode)
      localStorage.setItem("roomCode", newRoomCode)

      // Load new room data
      const roomKey = `room_${newRoomCode}`
      const roomData = JSON.parse(localStorage.getItem(roomKey) || '{"users": [], "messages": []}')

      // Add current user to new room
      if (currentUser) {
        const userIndex = roomData.users.findIndex((u: any) => u.ip === currentUser.ip)
        if (userIndex >= 0) {
          roomData.users[userIndex] = { ...currentUser, isOnline: true, lastSeen: new Date().toISOString() }
        } else {
          roomData.users.push({ ...currentUser, isOnline: true, lastSeen: new Date().toISOString() })
        }
        localStorage.setItem(roomKey, JSON.stringify(roomData))
      }

      setUsers(roomData.users)
      setMessages(roomData.messages)
      setChatType("main")
      setSelectedDmUser(null)
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 md:w-80 sm:w-full bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback style={{ backgroundColor: currentUser?.color || "#ea580c" }}>
                {(currentUser?.name || "").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="font-semibold text-sidebar-foreground">{currentUser?.name}</h2>
              <p className="text-sm text-muted-foreground">{currentUser?.ip}</p>
            </div>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={openSettings}>
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings
                  </DialogTitle>
                  <DialogDescription>
                    Customize your profile and app theme. All changes are saved locally.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="user" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="user" className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="theme" className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4" />
                      Theme
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="user" className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Display Name
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="name"
                          value={tempUserName}
                          onChange={(e) => setTempUserName(e.target.value)}
                          placeholder="Enter your display name"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={resetToIP}>
                          Use IP
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use your IP address ({currentUser?.ip})
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Avatar Color
                      </Label>
                      <div className="grid grid-cols-5 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setTempUserColor(color)}
                            className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                              tempUserColor === color ? "border-foreground shadow-lg" : "border-border"
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: tempUserColor }}>
                            {(tempUserName || currentUser?.ip || "").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">Preview</span>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="theme" className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Theme Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {themePresets.map((preset) => (
                            <Button
                              key={preset.name}
                              variant={tempTheme.name === preset.name ? "default" : "outline"}
                              size="sm"
                              onClick={() => applyPresetTheme(preset)}
                              className="justify-start"
                            >
                              <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: preset.primary }} />
                              {preset.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Custom Colors</Label>
                        <div className="grid gap-3">
                          <div className="flex items-center gap-3">
                            <Label className="text-xs w-20">Primary</Label>
                            <input
                              type="color"
                              value={tempTheme.primary}
                              onChange={(e) => updateThemeColor("primary", e.target.value)}
                              className="w-12 h-8 rounded border border-border cursor-pointer"
                            />
                            <Input
                              value={tempTheme.primary}
                              onChange={(e) => updateThemeColor("primary", e.target.value)}
                              className="flex-1 text-xs"
                              placeholder="#ea580c"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-xs w-20">Secondary</Label>
                            <input
                              type="color"
                              value={tempTheme.secondary}
                              onChange={(e) => updateThemeColor("secondary", e.target.value)}
                              className="w-12 h-8 rounded border border-border cursor-pointer"
                            />
                            <Input
                              value={tempTheme.secondary}
                              onChange={(e) => updateThemeColor("secondary", e.target.value)}
                              className="flex-1 text-xs"
                              placeholder="#f97316"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-xs w-20">Background</Label>
                            <input
                              type="color"
                              value={tempTheme.background}
                              onChange={(e) => updateThemeColor("background", e.target.value)}
                              className="w-12 h-8 rounded border border-border cursor-pointer"
                            />
                            <Input
                              value={tempTheme.background}
                              onChange={(e) => updateThemeColor("background", e.target.value)}
                              className="flex-1 text-xs"
                              placeholder="#ffffff"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-xs w-20">Text</Label>
                            <input
                              type="color"
                              value={tempTheme.foreground}
                              onChange={(e) => updateThemeColor("foreground", e.target.value)}
                              className="w-12 h-8 rounded border border-border cursor-pointer"
                            />
                            <Input
                              value={tempTheme.foreground}
                              onChange={(e) => updateThemeColor("foreground", e.target.value)}
                              className="flex-1 text-xs"
                              placeholder="#4b5563"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveUserSettings}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Room management section */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Share2 className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Current Room</p>
                <p className="font-mono font-bold text-sm">{roomCode}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Room switching */}
            <div className="flex gap-1">
              <Input
                value={tempRoomCode}
                onChange={(e) => setTempRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                className="flex-1 h-8 text-xs"
                maxLength={8}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (tempRoomCode.trim()) {
                    switchRoom(tempRoomCode.trim())
                    setTempRoomCode("")
                  }
                }}
                disabled={!tempRoomCode.trim()}
                className="h-8 px-2 text-xs"
              >
                Join
              </Button>
            </div>

            {/* Quick room buttons */}
            <div className="flex gap-1">
              {["GENERAL", "RANDOM", "GAMING"].map((room) => (
                <Button
                  key={room}
                  variant={roomCode === room ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchRoom(room)}
                  className="flex-1 h-7 text-xs"
                >
                  {room}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              variant={chatType === "main" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setChatType("main")
                setSelectedDmUser(null)
              }}
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Main Chat</span>
              <span className="sm:hidden">Main</span>
            </Button>
            <Button
              variant={chatType === "dm" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setChatType("dm")}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Direct Messages</span>
              <span className="sm:hidden">DMs</span>
            </Button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-card-foreground">
                  {chatType === "main"
                    ? `Main Chat - Room: ${roomCode}`
                    : selectedDmUser
                      ? `DM with ${selectedDmUser}`
                      : "Select a user to message"}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {chatType === "main"
                      ? `${users.length} users online`
                      : selectedDmUser && users.find((u) => u.name === selectedDmUser)?.isOnline
                        ? "Online"
                        : "Offline"}
                  </p>
                  {/* Connection status indicator */}
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        connectionStatus === "connected"
                          ? "bg-green-500"
                          : connectionStatus === "connecting"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {connectionStatus === "connected"
                        ? "Connected"
                        : connectionStatus === "connecting"
                          ? "Connecting..."
                          : "Disconnected"}
                    </span>
                  </div>
                </div>
              </div>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={openSettings}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {getFilteredMessages().length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {chatType === "main"
                    ? "No messages yet. Start the conversation!"
                    : selectedDmUser
                      ? `No messages with ${selectedDmUser} yet. Say hello!`
                      : "Select a user to start a direct message conversation"}
                </p>
                {chatType === "main" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Share room code <strong>{roomCode}</strong> with friends to chat
                  </p>
                )}
              </div>
            ) : (
              getFilteredMessages().map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: users.find((u) => u.name === message.sender)?.color || "#ea580c" }}
                    >
                      {(message.sender || "??").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{message.sender || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      {message.chatType === "dm" && (
                        <Badge variant="secondary" className="text-xs">
                          DM
                        </Badge>
                      )}
                    </div>
                    <Card className="p-3 bg-card border-border">
                      {message.type === "file" ? (
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          <span className="text-sm text-card-foreground">{message.fileName}</span>
                          {message.fileUrl && (
                            <Button variant="link" size="sm" asChild className="p-0 h-auto">
                              <a href={message.fileUrl} download={message.fileName} className="text-primary">
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-card-foreground whitespace-pre-wrap">
                          {message.text || "(Empty Message)"}
                        </p>
                      )}
                    </Card>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-background">
            {selectedFile && (
              <div className="mb-3 p-2 bg-muted rounded-lg flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground flex-1">{selectedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  Remove
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="*/*" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  chatType === "main"
                    ? "Type your message..."
                    : selectedDmUser
                      ? `Message ${selectedDmUser}...`
                      : "Select a user to message..."
                }
                className="flex-1 bg-input border-border"
                disabled={chatType === "dm" && !selectedDmUser}
              />

              <Button
                onClick={sendMessage}
                disabled={(!currentMessage.trim() && !selectedFile) || (chatType === "dm" && !selectedDmUser)}
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
