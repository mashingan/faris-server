var net = require('net');
var server = net.createServer();
var pool = [];
var now_playing = [];
var seek = [];

server.on('connection', function(socket) {
  console.log('got a new connection');
  socket.write('ready\n');
  socket.setEncoding('utf8');

  socket.on('data', function(data) {
    data = data.replace('\r\n','');
    var info = data.split(';;',2);
    switch(info[1]){
      case 'init':
        var obj = JSON.parse(info[1]);
        obj.sock = socket;
        pool.push(obj);
        socket.write('parsing ok\n');
        break;

      case 'start':
        var challenger = searchfrom(pool, function(x){
          return x.sock == socket; });
        if(seek.length > 0){
          var opponent = take1from(seek);
          now_playing.push({ p1: challenger, p2: opponent });
          now_playing.push({ p1: opponent, p2: challenger });
          opponent.sock.write('You are now playing with: '
            +challenger.user+'.\n');
          challenger.sock.write('You are now playing with: '
            +opponent.user+'.\n');
        }else{
          socket.write('Waiting opponent\n');
          seek.push(challenger);
        }
        break;

      case 'play':
        var obj = searchfrom(now_playing, function(x){
          return x.p1.sock == socket });
        if(obj && (obj != [])) obj.p2.sock.write(info[1]+'\n');
        else seek.push(obj);
        break;

      case 'win':
        console.log(searchfrom(pool, function(x){
          return x.sock == socket; }).user+' win');
        deletefrom(now_playing, function(x){
          return ((x.p1.sock == socket) || (x.p2.sock == socket)); });
        break;

      case 'with':
        var opponent;
        for(var i in seek)
          if(seek[i].user == info[1])
            opponent = seek.splice(i, 1)[0];
       
        var challenger = searchfrom(pool, function(x){
          return x.sock == socket; });
        now_playing.push({ p1: challenger, p2: opponent });
        now_playing.push({ p1: opponent, p2: challenger });
        break;

      case 'quit':
        deletefrom(pool, function(x){ return x.sock == socket; });
        socket.destroy();
        break;

      case 'list':
        pool.forEach(function(entry){
          if(entry.sock != socket) socket.write(entry.user+'\n');
        });
        break;

      case 'who':
        seek.forEach(function(player){
          if(player.sock != socket) socket.write(player.user+'\n');
        });
        break;

      default:
        socket.write(data+'\n');
        break;
    }
  });

  socket.on('close', function() {
    console.log('connection closed');
  });

});
server.on('error', function(err) {
  console.log('Server error:', err.message);
});

server.on('close', function() {
  console.log('Server closed');
});
server.listen(4001);

// Internal APIs
function take1from(arr){
  return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
}

function deletefrom(arr, test){
  for (var i=0; i<arr.length; i++){
    if(test(arr[i])) arr.splice(i, 1);
  }
}

function searchfrom(arr, test){
  for (var i in arr){
    if(test(arr[i])) return arr[i];
  }
}
