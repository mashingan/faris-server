var net = require('net');
var server = net.createServer();
var users = {};
var now_playing = {};
var seek = [];

var PORT = 4001;

var TPART = 8; // tournament participant
var tcount = 0; // tournament participant counter

server.on('connection', function(socket) {
  console.log('got a new connection');
  socket.write('ready\n');
  socket.setEncoding('utf8');
  socket.name = '';

  socket.on('data', function(data) {
    data = data.replace('\r\n','');
    var info = data.split(';;',3);
    switch(info[0]){
      case 'init':
        socket.name = info[1];
        var obj = {};
        var player = now_playing[info[1]];
        if(player){
          clearTimeout(player.timer);
          obj.sock = socket;
          obj.type = '1v1';
          obj.playing = true;
          now_playing[player.opponent].sock = Object.create(socket);
          users[info[1]] = obj;
        }else{
          try{
            obj = JSON.parse(info[2]);
          }catch(err){
            obj.type = '1v1';
            obj.playing = false;
          }finally{
            obj.sock = socket;
            users[info[1]] = obj;
          }
          socket.write('parsing ok\n');
        }
        break;

      case 'start':
        if(seek.indexOf(info[1]) == -1){
          if(seek.length > 0){
            draftto(now_playing, info[1], take1from(seek));
          }else{
            socket.write('Waiting opponent\n');
            seek.push(info[1]);
          }
        }else socket.write('Waiting opponent\n');
        break;

      case 'play':
        var obj = now_playing[info[1]];
        if(obj){
          try{
            obj.sock.write(info[2]+'\n');
          }catch (the_error){
            console.log(the_error);
            socket.write('You opponent is disconnected.\n'); }}
        else socket.write('You are not currently playing.\n');
        break;

      case 'win':
        win(info[1], now_playing);
        break;

      case 'with':
        var opp_name;
        if (seek.length > 0){
          var pos = seek.indexOf(info[2]);
          if(pos >= 0)
            opp_name = seek.splice(pos, 1)[0];
        }
       
        if(opp_name)
          draftto(now_playing, info[1], opp_name);
        else
          socket.write("There's no opponent whose name "+info[2]
              +'. Check again.\n');
        break;

      case 'quit':
        var player = now_playing[info[1]];
        var opp;
        if(player){
          opp = player.opponent;
          users[info[1]].playing = false;
          users[opp].playing = false;
        }
        delete now_playing[info[1]];
        delete now_playing[opp];
        socket.destroy();
        break;

      case 'list':
        socket.write('List of all players:\n');
        for(var user in users)
          if(user != info[1]) socket.write(user+'\n');
        break;

      case 'who':
        socket.write('List of opponent(s):\n');
        for(var opponent in seek)
          if(seek[opponent] != info[1]) socket.write(seek[opponent]+'\n');
        break;

      default:
        socket.write(data+'\n');
        break;
    }
  });

  socket.on('close', function() {
    console.log(socket.name+' disconnected!');
    var opponent = now_playing[socket.name];
    if(opponent){
      try{
        opponent.sock.write('Opponent: '+socket.name+' disconnected!\n');
        opponent.timer = setTimeout(function(){
          opponent.sock.write('win');
        }, 20000);
      }catch(err){
        console.log('on close error: '+err);
      }
    }
    delete users[socket.name];
    console.log(socket.name+"'s connection closed.");
  });

  socket.on('error', function(err){
    console.log(socket.name+' is '+err);
  });

});
server.on('error', function(err) {
  console.log('Server error:', err.message);
});

server.on('close', function() {
  console.log('Server closed');
});
server.listen(PORT);

// Internal APIs
function take1from(arr){
  return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
}

function draftto(object, challenger, opponent){
  var opp = users[opponent];
  var cha = users[challenger];
  cha.playing = true;
  opp.playing = true;
  object[challenger] = {opponent: opponent,
    sock: Object.create(opp.sock), timer: false };
  object[opponent] = {opponent: challenger,
    sock: Object.create(cha.sock), timer: false };
  opp.sock.write('You are now playing with: '
      +challenger+'.\n');
  cha.sock.write('You are now playing with: '
      +opponent+'.\n'); }

function win(winner, from){
  console.log(winner+' wins.');
  var opp = from[winner];
  var opponent;
  if(opp){
    var opponent = opp.opponent;
    opp.sock.write('You lose.\n');
  };
  delete from[winner];
  delete from[opponent]; }
