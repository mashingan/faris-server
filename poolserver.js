var net = require('net');
var server = net.createServer();
var pool = [];
var now_playing = [];
var seek = [];

//var timer;

server.on('connection', function(socket) {
  console.log('got a new connection');
  socket.write('ready\n');
  socket.setEncoding('utf8');

  socket.on('data', function(data) {
    data = data.replace('\r\n','');
    var info = data.split(';;',2);
    switch(info[0]){
      case 'init':
        var obj;
        try{
          obj = JSON.parse(info[1]);
        }catch(err){
          obj = {user: info[1]};
        }finally{
          obj.sock = socket;
          pool.push(obj); }
        for(var i in now_playing){
          if(now_playing[i].p1.user == obj.user){
            now_playing[i].p1.sock = socket;
            clearTimeout(timer);
          }else if(now_playing[i].p2.user == obj.user){
            now_playing[i].p2.sock = socket;
            clearTimeout(timer);
          }
        }
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
        if(obj && (obj != [])){
          try{
            obj.p2.sock.write(info[1]+'\n');
          }catch (the_error){
            console.log(the_error);
            socket.write('You opponent is disconnected.\n');
          }
        }
        break;

      case 'win':
        console.log(searchfrom(pool, function(x){
          return x.sock == socket; }).user+' win');
        /*deletefrom(now_playing, function(x){
          return (x.p1.sock == socket) || (x.p2.sock == socket); });*/
        deletefrom(now_playing, function(x){
          return x.p1.sock == socket; });
        deletefrom(now_playing, function(x){
          return x.p2.sock == socket; });
        break;

      case 'with':
        var opponent;
        for(var i in seek)
          if(seek[i].user == info[1])
            opponent = seek.splice(i, 1)[0];
       
        var challenger = searchfrom(pool, function(x){
          return x.sock == socket; });
        opponent.sock.write('You are now playing with: '
            +challenger.user+'.\n');
        challenger.sock.write('You are now playing with: '
            +opponent.user+'.\n');
        now_playing.push({ p1: challenger, p2: opponent });
        now_playing.push({ p1: opponent, p2: challenger });
        break;

      case 'quit':
        /*deletefrom(now_playing, function(x){
          return (x.p1.sock == socket) || (x.p2.sock == socket); });*/
        deletefrom(now_playing, function(x){
          return x.p1.sock == socket; });
        deletefrom(now_playing, function(x){
          return x.p2.sock == socket; });
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
    var obj = searchfrom(pool, function(x){ return x.sock == socket; });
    deletefrom(pool, function(x){ return x.sock == socket; });
    console.log(obj.user+' disconnected!');
    for(var i in now_playing){
      if(now_playing[i].p1.user == obj.user){
        /*timer = setTimeout(function(){
          console.log(obj.user+' is disconnected too long.\n'
            +now_playing[i].p2.user+"'s win.");
          now_playing[i].p2.sock.write('You win.\n');
          deletefrom(now_playing, function(x){
            return (x.p1.user == obj.user) || (x.p2.user == obj.user); });
        }, 15000);*/
        now_playing[i].p2.sock.write(
          'Opponent: '+obj.user+' disconnected!\n');
      }
    }
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

/*function deletefrom(arr, test){
  var count = 0;
  for(var i in arr){
    if(test(arr[i])){
      delete arr[i];
      count++; }}
  arr.length -= count;
}*/
function deletefrom(arr, test){
  for(var i in arr) if(test(arr[i])) arr.splice(i, 1); }

function searchfrom(arr, test){
  for (var i in arr){
    if(test(arr[i])) return arr[i];
  }
}
