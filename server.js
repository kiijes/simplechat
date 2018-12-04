var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

var log = [];
var users = [];

http.listen(3010, function() {
    console.log('listening on *:3010');
});

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client.html');
});

io.on('connection', function(socket) {
    console.log('user connected');
    var user = {
        name: null
    };
    
    if (log.length > 0) {
        console.log('log not empty');
    }

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });

    socket.on('name entered', function(name) {
        var nameIsGood = checkName(name);

        if (users.length > 0) {
            if (nameIsGood === false) {
                console.log('emitting invalid name');
                socket.emit('invalid name', 'Name is already taken');
                return;
            }
        }

        console.log('emitting valid name');

        user.name = name;
        users.push(name);
        if (log.length > 0) {
            for (var i = 0; i < log.length; i++) {
                socket.emit('msg log', log[i]);
            }
        }

        socket.emit('valid name');
        var str = user.name + ' has joined the chat';
        logMessage(str);
        io.emit('join message', str);
        
    });

    socket.on('message', function(msg) {
        var str = user.name + ': ' + msg;
        logMessage(str);
        io.emit('message to all', str);
    });
});

function logMessage(msg) {
    log.push(msg);
}

function checkName(name) {
    for (var i = 0; i < users.length; i++) {
        if (name === users[i]) {
            console.log('bad name');
            return false;
        }
    }
    return true;
}