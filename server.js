var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');
var striptags = require('striptags');
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

    socket.emit('first conn');

    var user = {
        name: null
    };
    
    if (log.length > 0) {
        for (var i = 0; i < log.length; i++) {
            socket.emit('msg log', log[i]);
        }
    }

    socket.on('disconnect', function() {
        console.log('user disconnected');
        if (user.name === null) {
            return;
        }

        var str = '<p><strong>' + user.name + ' has disconnected</strong></p>';
        logMessage(str);
        io.emit('join message', str);

        for (let i = 0; i < users.length; i++) {
            if (user.name === users[i]) {
                users.splice(i, 1);
                return;
            }
        }
    });

    socket.on('name entered', function(name) {
        var nameIsGood = checkName(name);

        if (nameIsGood.check === false) {
            console.log('emitting invalid name');
            console.log(nameIsGood.error);
            socket.emit('invalid name', nameIsGood.error);
            return;
        }

        console.log('emitting valid name');

        user.name = name;
        users.push(name);

        socket.emit('valid name');
        var str = '<p><strong>' + user.name + ' has joined the chat' + '</strong></p>';
        logMessage(str);
        io.emit('join message', str);
        
    });

    socket.on('message', function(msg) {
        msg = striptags(msg);
        if (msg.length > 1880) {
            return false;
        }
        var msgDate = new Date(Date.now());
        var str = '<p><small>' + msgDate.toTimeString().slice(0, 8) + '</small> - <strong>' + user.name + '</strong>: ' + msg + '</p>';
        logMessage(str);
        io.emit('message to all', str);

        var checkObject = checkEmbed(msg);

        switch (checkObject.type) {
            case 'youtube':
                var ytEmbed = '<div class="messageDiv"><iframe width="560" height="315" src="https://www.youtube.com/embed/' + checkObject.id + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
                io.emit('message to all', ytEmbed);
                break;

            case 'image':
                var imgEmbed = '<div class="messageDiv"><img class="chatimg" src="' + msg + '"></div>';
                io.emit('message to all', imgEmbed);
                break;
        
            default:
                break;
        }
    });
});

function logMessage(msg) {
    log.push(msg);
}

function checkName(name) {
    var nameRegExp = /^[a-zA-Z0-9_-]{3,15}$/
    var nameMatch = name.match(nameRegExp);
    
    if (nameMatch === null) {
        return { 
            'check': false,
            'error': 'Name needs to be min 3 and max 15 characters and can only contain alphanumerics and _ or -'
        }
    }

    if (users.length > 0) {
        for (var i = 0; i < users.length; i++) {
            if (name === users[i]) {
                console.log('bad name');
                return { 
                    'check': false,
                    'error': 'Name is already taken'
                }
            }
        }
    }

    return { 
        'check': true,
        'error': 'Name is valid'
    }
}

function checkEmbed(msg) {
    ytRegEx = /^http[s]*:\/\/(youtu\.be\/|(www\.)*youtube\.com\/(watch\?v=|(embed|v)\/))([a-zA-Z0-9-_]{11})$/;
    imgRegEx = /^(http[s]*:\/\/)?(www\.)?[a-zA-Z0-9.\-]+\.[a-z]+[A-Za-z0-9_.~\-!*'();:@&=+$,/?#\[\]]+(\.(png|PNG|jpg|JPG|jpeg|JPEG|gif|GIF))+$/;

    var ytMatch = msg.match(ytRegEx);
    var imgMatch = msg.match(imgRegEx);

    if (ytMatch !== null && msg.length === ytMatch[0].length) {
        console.log('yt link matched');
        return { 
            'type': 'youtube',
            'id': ytMatch[ytMatch.length-1]
        }
    }

    if (imgMatch !== null && msg.length === imgMatch[0].length) {
        console.log('image matched');
        return {
            'type': 'image'
        }
    }

    return {
        'type': ''
    }
}