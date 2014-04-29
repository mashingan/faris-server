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
    if (info[0] == 'init'){
      var obj = JSON.parse(info[1]);
      obj.sock = socket;
      pool.push(obj);
      socket.write('parsing ok\n');
    }else if(info[0] == 'start'){
      if(seek.length){
        var opponent = take1from(seek);
        var challenger = searchfrom(pool, function(x){
          return x.sock == socket; });
        now_playing.push({ p1: challenger, p2: opponent });
        now_playing.push({ p1: opponent, p2: challenger });
      }else seek.push(searchfrom(pool, function(x){
        return x.sock == socket; }));
    }else if(info[0] == 'play'){
      var obj = searchfrom(now_playing, function(x){
        return x.p1.sock == socket });
      if(obj != []) obj.p2.sock.write(info[1]+'\n');
      else seek.push(obj);
    }else if(info[0] == 'win'){
      console.log(searchfrom(pool, function(x){
        return x.sock == socket }).user+' win');
      // bug prone, I think, let's see whether this will be stable
      // enough
      for(var i=0; i<now_playing.length; i++){
        if((now_playing[i].p1.sock == socket) ||
           (now_playing[i].p2.sock == socket))
          now_playing.splice(i, 1);

        /* less effective version because will traverse twice
        deletefrom(now_playing, function(x){return x.p1.sock==socket;});
        deletefrom(now_playing, function(x){return x.p2.sock==socket;});
        */
      }
    }else if(info[0] == 'with'){
      var opponent = searchfrom(seek, function(x){
        return x.user == info[1]; });
      var challenger = searchfrom(pool, function(x){
        return x.sock == socket; });
      now_playing.push({ p1: challenger, p2: opponent });
      now_playing.push({ p1: opponent, p2: challenger });
    }else if(info[0] == 'quit'){
      deletefrom(pool, function(x){ return x.sock == socket; });
      socket.destroy();
    }else if(info[0] == 'list'){
      pool.forEach(function(entry){
        if(entry.sock != socket) socket.write(entry.user+'\n');
      });
    }else if(info[0] == 'who'){
      seek,forEach(function(player){
        if(player.sock != socket) socket.write(player.user+'\n');
      });
    }else{
      socket.write(data+'\n');
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
  //using integer index version
  //for (var i=0; i<arr.length; i++){
  for (var i in arr){
    if(test(arr[i])) arr.splice(i, 1);
  }
}

function searchfrom(arr, test){
  for (var i in arr){
    if(test(arr[i])) return arr[i];
  }
}
