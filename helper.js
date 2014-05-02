var net = require('net');

function take1from(arr){
  return arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
}

function deletefrom(arr, test){
  var count = 0;
  for(var i in arr){
    if(test(arr[i])){
      delete arr[i];
      count++; }}
  arr.length -= count;
}

function searchfrom(arr, test){
  for (var i in arr){
    if(test(arr[i])) return arr[i];
  }
}

function makeplayers(n){
  var res = [];
  for(var i=0;i<n;i++) res.push({user: 'user'+i, sock: 'socket'+i });
  return res; }

function populate(from, n){
  var res = [];
  for(var i=0;i<n;i++){
    var opp = from[Math.floor(Math.random() * from.length)];
    var cha = from[Math.floor(Math.random() * from.length)];
    res.push({p1: opp, p2: cha});
    res.push({p1: cha, p2: opp}); }
  return res;
}

function send(sock, mode, msg){
  var header = mode+';;';
  sock.write(header+sock.name+';;'+msg);
}

function create_socket(name, port, host){
  var socket = new net.Socket();
  socket.name = name;
  socket.setEncoding('utf8');
  socket.on('data', function(data){
    console.log(name+' reply: '+data); });
  socket.on('connect', function(){
    send(socket, 'init', ''); });
  if(host)
    socket.connect(port, host);
  else
    socket.connect(port);
  return socket;
}

/*exports.populate = populate;
exports.makeplayers = makeplayers;
exports.searchfrom = searchfrom;
exports.deletefrom = deletefrom;
exports.take1from = take1from;*/
exports.create_socket = create_socket;
exports.send = send;
