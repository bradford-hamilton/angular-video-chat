var express = require('express'),
    expressApp = express(),
    socketio = require('socket.io'),
    http = require('http'),
    server = http.createServer(expressApp),
    uuid = require('node-uuid'),
    rooms = {},
    userIds = {};

expressApp.use( express.static(__dirname +  '/../public/dist/') );

exports.run = function(config) {

  server.listen(config.PORT);
  socketio.listen(server, { log: false })
  .on('connection', function(socket) {
    var currentRoom;
    var id;

    socket.on('init', function(data, callback) {
      currentRoom = (data ||  {}).room || uuid.v4();
      var room = rooms[currentRoom];
      if (!data) {
        rooms[currentRoom] = [socket];
        id = userIds[currentRoom] = 0;
        callback(currentRoom, id);
        console.log('Room created, with #', currentRoom);
      } else {
        if (!room) {
          return;
        }
        userIds[currentRoom] += 1;
        id = userIds[currentRoom];
        callback(currentRoom, id);
        room.forEach(function(s) {
          s.emit('peer.connected', { id: id });
        });
        room[id] = socket;
        console.log('Peer connected to room,', currentRoom, 'with #', id);
      }
    });

    socket.on('msg', function(data) {
      var to = parseInt(data.to, 10);
      if (rooms[currentRoom] && rooms[currentRoom][to]) {
        console.log('Redirecting message to', to, 'by', data.by);
        rooms[currentRoom][to].emit('msg', data);
      } else {
        console.warn('Invalid User');
      }
    });

    socket.on('disconnect', function() {
      if (!currentRoom || !rooms[currentRoom]) {
        return;
      }
      delete rooms[currentRoom][rooms[currentRoom].indexOf(socket)];
      rooms[currentRoom].forEach(function(socket) {
        if (socket) {
          socket.emit('peer.disconnected', { id: id });
        }
      });
    });

  });

};
