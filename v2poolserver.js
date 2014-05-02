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
        try{
          obj = JSON.parse(info[2]);
        }catch(err){
          obj.type = '1v1';
          obj.playing = false;
        }finally{
          obj.sock = socket;
          users[info[1]] = obj; }
        socket.write('parsing ok\n');
        break;

      case 'start':
        if(seek.length > 0){
          draftto(now_playing, info[1], take1from(seek));
        }else{
          socket.write('Waiting opponent\n');
          seek.push(info[1]);
        }
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
        for(var i in seek)
          if(seek[i] == info[2])
            opp_name = seek.splice(i, 1)[0];
       
        draftto(now_playing, info[1], opp_name);
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
          if(opponent != info[1]) socket.write(seek[opponent]+'\n');
        break;

      default:
        socket.write(data+'\n');
        break;
    }
  });

  socket.on('close', function() {
    console.log(socket.name+' disconnected!');
    var opponent = now_playing[socket.name];
    if(opponent) 
      opponent.sock.write('Opponent: '+socket.name+' disconnected!\n');
    delete users[socket.name];
    console.log(socket.name+"'s connection closed.");
    //console.log('connection closed.');
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
    sock: Object.create(opp.sock) };
  object[opponent] = {opponent: challenger,
    sock: Object.create(cha.sock) };
  opp.sock.write('You are now playing with: '
      +challenger+'.\n');
  cha.sock.write('You are now playing with: '
      +opponent+'.\n'); }

function win(winner, from){
  console.log(winner+' wins.');
  var opponent = now_playing[winner].opponent;
  users[winner].playing = false;
  users[opponent].playing = false;
  delete now_playing[winner];
  delete now_playing[opponent]; }
