const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMsg, generateLocationMsg } = require('./utils/messages')
const { addUser,removeUser,getUsers,getUsersByRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000  
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) =>{
    console.log('new web socket connection!')

    socket.on('join', ( options, callback) => {
     const {error, user} =   addUser({ id: socket.id , ...options })
     if (error) {
      return callback(error)
     }
        socket.join(user.room)

        socket.emit('message', generateMsg('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMsg('Admin' ,`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersByRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback ) => {

        const user = getUsers(socket.id)
        const filter = new Filter()

        if (filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMsg(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUsers(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username , `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
         io.to(user.room).emit('message', generateMsg('Admin' ,`${user.username} has left!`))
         io.to(user.room).emit('roomData' , {
             room: user.room,
             users: getUsersByRoom(user.room)
         })
        }        
     })
   
})
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})