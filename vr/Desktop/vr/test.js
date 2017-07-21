var cluster = require('cluster');
var numCPUs = require('os').cpus().length;


console.log("some app start") ;

if (cluster.isMaster) {
    // Fork workers.

    console.log("start isMaster cpu:" + numCPUs) ;

    var pool = {};
    for (var i = 0; i < numCPUs; i++) {
        createworker(pool);
    }

    cluster.on('death', function(worker) {
        console.log('worker ' + worker.pid + ' died');
        createworker(pool);
    });

    function createworker(pool) {
        var worker = cluster.fork();
        var sid = new Date().getTime() + '' + Math.random();

        pool[sid] = worker;
        //worker.send("hahahah {id: sid}");
        console.log('worker created: ' + sid);
    }

    setTimeout(function(){
      console.log("pool has:" + pool ) ;
      Object.keys(pool).forEach(function(key) {
        var worker = pool[key];
        //console.log(" foreach key=" + key) ;
        console.log("worker = " + worker + "," + worker.id) ;
        //worker.send({ msg:"this is a msg: " + key} ) ;
        worker.send(" hi are you worker???" + worker.id) ;
      });
    }, 1000);

} else {
  console.log("hi i am work thread !?!?") ;
  process.on('message', function(msg) {
    console.log("recvMessage=" + msg) ;
  });

  setTimeout(function(){
    console.log("worker after 2 seconds") ;
  }, 2000);
}
