
/*
var path = "/dev/video0" ;
var name = "noname" ; // like left/right back etc.
var v4l2cam ;

var sizeRaw ;
var size256 ;
var size512 ;
*/
var v4l2camera = require("v4l2camera");
var imagemagick = require('imagemagick-native') ;
var cluster = require('cluster');

function CamUnit(nn, pp, ww = 640, hh = 480) {
  var path = pp ;
  var name = nn ;
  var count = 0 ;

  var raw ; // for unit8array
  var rawBase64 ; // for name/base64

  var raw512 ; // buffer
  var raw512base64 ; // string

  var worker ;
  var worker2 ;

  var buffer ; // for buffer type

  //var isBusy = false ;
  //var isBusy2 = false ;

  var camera = new v4l2camera.Camera(path) ;
  var format = camera.configGet() ;

  format.width = ww ;
  format.height = hh ;
  camera.configSet(format) ;

  if (camera.configGet().formatName !== "MJPG") {
    console.log("NOTICE: MJPG camera required");
    process.exit(1);
  }

  // when new raw image coming @@
  // run in a new thread is batter
  var processRaw = function( ) {
      // get base64 ;
      // get 512 x 512;
      var decodeBuffer = Buffer.from(rawBase64, 'base64') ;
      imagemagick.convert({
          srcData: buffer , // provide a Buffer instance
          width: 512,
          height: 512,
          resizeStyle: "aspectfit",
          quality: 70,
          format: 'JPEG'
      }, function( err, buf ) {

        if ( buf != undefined ) {
          console.log("same process: convert 512 success") ;
          raw512base64 = buf.toString('base64')
          raw512 = buf ;
          //process.send(msg) ;
        }
        else {
          console.log("same process: convert 512 done, err=" + err) ;
        }

      });


  } ;
  this.processRaw = processRaw ;

  var localCapture = function(success) {
    count = count + 1 ;
    raw = camera.frameRaw(); // uint8 array

    buffer = Buffer.from( raw ); // 幹 如果是 new Buffer( arr )就不行，操
    //rawBase64 = "data:image/jpeg;base64," + buffer.toString('base64') ;
    rawBase64 = buffer.toString('base64') ;
    //processRaw() ;

    if ( worker != undefined ) {
      var msg = { "name": name, "rawBase64": rawBase64 } ;

      /*
      if ( worker.isBusy == false ) {
        msg.id = 1 ;
        worker.isBusy = true ;
        worker.send( msg ) ;
      }
      else if ( worker2.isBusy == false ) {
        msg.id = 2;
        worker2.isBusy = true ;
        worker2.send( msg ) ;
      }
      */

    }


    camera.capture( localCapture );
    if ( count % 10 == 0 ) {
        console.log("CamUnit " + name + " get one, count=" + count + "Busy:" + worker.isBusy + "," + worker2.isBusy ) ;
    }
  };
  this.localCapture = localCapture ;
  // class methods

  var setWorker = function(w, w2) {
      worker = w ;
      worker2 = w2 ;
      worker.isBusy = false ;
      worker2.isBusy = false ;
  } ;

  this.setWorker = setWorker ;

  // a express app
  var localBindAddress = function( server ) {
      console.log("bind app with name:" + name) ;
      server.get('/' + name ,function(request, response){
          if ( buffer != undefined ) {
              response.writeHead(200, {'Content-Type': 'image/jpeg'});
              response.end(buffer);
          }
          else {
            response.end() ;
          }
      }) ;

      server.get('/' + name + "base64" ,function(request, response){
          if ( rawBase64 != undefined ) {
              response.end(rawBase64);
          }
          else {
            response.end() ;
          }
      }) ;

      server.get('/' + name + "512",function(request, response){
          if ( raw512 != undefined ) {
              response.writeHead(200, {'Content-Type': 'image/jpeg'});
              response.end(raw512);
          }
          else {
            response.end() ;
          }
      }) ;

      server.get('/' + name + "512base64",function(request, response){
          if ( raw512base64 != undefined ) {
              response.end(raw512base64);
          }
          else {
            response.end() ;
          }
      }) ;
  } ;
  this.localBindAddress = localBindAddress ;


  var parseMessage = function(msg) {

    if ( msg.id == 1 ) {
      worker.isBusy = false ;
    }
    else if ( msg.id == 2 ) {
      worker2.isBusy = false ;
    }
      if ( msg.name == name  && msg.raw512base64 != undefined ) {
          raw512base64 = msg.raw512base64 ;
          raw512 = Buffer.from(msg.raw512base64, 'base64');
          console.log("Parse Success d la~~~" + raw512.length ) ;
      }
      else {
        console.log("error pase wrong name")
      }
  }
  this.parseMessage = parseMessage ;
  /*
  CamUnit.prototype.close = function() {
        camera.stop() ;
  };
  */

  CamUnit.prototype.setWorker = setWorker ;
  CamUnit.prototype.processRaw = processRaw ;
  CamUnit.prototype.bindAddress = localBindAddress ;
  CamUnit.prototype.capture = localCapture ;
  CamUnit.prototype.parseMessage = parseMessage ;

  camera.start() ;
  camera.capture( localCapture ) ;
}

// export the class
module.exports = CamUnit;
