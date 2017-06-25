
'use strict';
var sys = require('util') ;
var ws = require('ws').Server;
var http = require('http');
var express = require('express');
var path = require('path');

var fs = require('fs') ;
var Jimp = require("jimp");

//var ffcmd = require('./ffmpegcmd.js') ;

var v4l2camera = require("v4l2camera");

var leftCam = new v4l2camera.Camera("/dev/video0");
var rightCam = new v4l2camera.Camera("/dev/video1");

var format = leftCam.configGet() ;
format.interval.denominator = 8 ;
       //interval.numerator
format.width = 320 ;
format.height = 240 ;

leftCam.configSet(format) ;
rightCam.configSet(format) ;

var leftCount = 0 ;
var rightCount = 0 ;

var leftRaw ;
var rightRaw ;

if (leftCam.configGet().formatName !== "MJPG") {
  console.log("NOTICE: MJPG camera required");
  process.exit(1);
}

function send(msg) {
  for (var i = 0; i < clients.length; i++) {
    		if ( clients[i].readyState === 1 ) {
   			clients[i].send( msg ) ;
   		}
  }
}

var cnt = 0 ;
var captureFunc = function (success) {
  leftCount = leftCount + 1 ;
  if ( leftCount % 3 == 0 ) {
      var frame = leftCam.frameRaw();

      /*
      Jimp.read(new Buffer(frame), function(err, image){
        image.resize(256, 256) ;
        image.getBuffer( Jimp.MIME_JPEG, function(buf) {
          leftRaw = buf ;
        });
      });
      */
       leftRaw = frame ;
      console.log("Get left frame" + leftCount + ", ret=" + success) ;
      var arr = {
                 name: "left",
                 msg: "count=" + cnt ,
                 video: "data:image/jpeg;base64," + new Buffer(frame).toString('base64'),
                 tt: new Date().getTime()
               } ;

      send( JSON.stringify( arr ) );
  }
  leftCam.capture(captureFunc);
} ;
leftCam.start();
leftCam.capture(captureFunc);

var captureRight = function (success) {
  rightCount = rightCount + 1 ;
  if ( leftCount % 3 == 0 ) {
      var frame = rightCam.frameRaw();
      rightRaw = frame ;
      console.log("Get right frame" + rightCount + ", ret=" + success) ;
      var arr = {
                 name: "right",
                 msg: "count=" + cnt ,
                 video: "data:image/jpeg;base64," + new Buffer(frame).toString('base64'),
                 tt: new Date().getTime()
               } ;

      send( JSON.stringify( arr ) );
  }
  rightCam.capture(captureRight);
} ;
rightCam.start();
rightCam.capture(captureRight);

var port = 8082 ;


var app = express();
var server = http.createServer(app);

app.use("/", express.static( __dirname + '/public'));


app.get('/left',function(request, response){
    if ( leftRaw != undefined ) {
        response.writeHead(200, {'Content-Type': 'image/jpeg'});
        response.end(new Buffer(leftRaw, 'binary'));
        //response.end(leftRaw);
    }
    else {
      response.end() ;
    }
});


app.get('/right',function(request, response){
    if ( rightRaw != undefined ) {
        response.writeHead(200, {'Content-Type': 'image/jpeg'});
        response.end(new Buffer(rightRaw, 'binary'));
    }
    else {
      response.end() ;
    }
});


server.listen(port ,'0.0.0.0',function(ret){
    console.log('HTTP伺服器在 http://127.0.0.1:' + port + '/ 上運行 success XD' + ret );
});

//cmd.saveIPCamToMp4("ipcam640") ;

var server = new ws({port: 8081});

var cams = [] ;
var clients = [];
var names = [] ;

var saveMessage = function( arr ) {

/*
  if ( arr.video != undefined ) {
    var base64Data = arr.video.replace(/^data:image\/jpeg;base64,/, "");

    require("fs").writeFile( ffcmd.path + "tmp/" + arr.name + "_" + arr.tt + ".jpg", base64Data, 'base64', function(err) {
      console.log( "write video:" + err);
    });
  }

  if ( arr.audio != undefined ) {
    var audioBase64data = arr.audio.replace(/^data:audio\/wav;base64,/, "");

    require("fs").writeFile( ffcmd.path + "tmp/" + arr.name + "_" + arr.tt + ".wav", audioBase64data, 'base64', function(err) {
      console.log( "write audio:" + err);
    });
  }
*/
}

server.on("connection", function(websocket) {
    clients.push(websocket);

    sys.debug(clients.length);

    websocket.on('message', function(data) {
      	var arr = JSON.parse(data) ;
      	console.log( "recv message:" + arr.msg ) ;

        saveMessage( arr ) ;

        for (var i = 0; i < clients.length; i++) {
           if ( clients[i] == websocket ) {
                // push to server
                websocket._name = "" + arr.name ;
                names[websocket] = "" + arr.name ;

                cams.push( websocket ) ;
                clients.splice(i) ;
                break ;
           }
           else {
           		if ( clients[i].readyState === 1 ) {
           			clients[i].send( data ) ;
           		}
           }
    	  }


    });

    websocket.on('error', function() {
        sys.debug('error try to close this one socket');

        for (var i = 0; i < clients.length; i++) {
            if (clients[i] == websocket) {
                clients.splice(i);
                break;
            }
        }
    });

    websocket.on('close', function() {
        sys.debug('close');

        for (var i = 0; i < clients.length; i++) {
            if (clients[i] == websocket) {
                clients.splice(i);
                break;
            }
        }
        for (var i = 0; i < cams.length; i++) {
            if (cams[i] == websocket) {
                cams.splice(i);
                // to do: save mp4 @@

                console.log("Webcam:" + names[websocket]  + " disconnect !!!") ;
                //ffcmd.saveIPCamToMp4( names[websocket]  ) ;
                delete names[websocket] ;
                break;
            }
        }
    });
});

server.on("error", function(websocket) { console.log("error@@") ;})

console.log("app start") ;
