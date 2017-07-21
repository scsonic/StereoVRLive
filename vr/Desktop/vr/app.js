
'use strict';
var sys = require('util') ;
var ws = require('ws').Server;
var http = require('http');
var express = require('express');
var path = require('path');

var fs = require('fs') ;
//var ffcmd = require('./ffmpegcmd.js') ;

var CamUnit = require("./CamUnit.js") ;
var cluster = require('cluster');
var imagemagick = require('imagemagick-native') ;

if (cluster.isMaster) {
  console.log("isMaster") ;


  var port = 8082 ;
  var app = express();
  var server = http.createServer(app);

  app.use("/", express.static( __dirname + '/public'));

 
  // note: you must be plugged two camera or will report can't open file error
  var rightCam = new CamUnit( "right", "/dev/video1", 640,480 ) ;
  var leftCam = new CamUnit( "left", "/dev/video0", 640,480 ) ;


  leftCam.setWorker( cluster.fork(), cluster.fork() ) ;
  rightCam.setWorker( cluster.fork(), cluster.fork()  ) ;

  for (const id in cluster.workers) {
    cluster.workers[id].on('message', function(msg){

        console.log("Main: recv message~~: " + msg.name ) ;
        if ( msg.name == "left" ) {
            leftCam.parseMessage( msg ) ;
        }
        else if (msg.name == "right") {
            rightCam.parseMessage( msg ) ;
        }
    });
  }


  leftCam.localBindAddress( app ) ;
  rightCam.localBindAddress( app ) ;



  server.listen(port ,'0.0.0.0',function(){
    console.log('HTTP伺服器在 http://127.0.0.1:' + port + '/ 上運行 success XD' );
  });

  function send(msg) {
      for (var i = 0; i < clients.length; i++) {
        		if ( clients[i].readyState === 1 ) {
       			clients[i].send( msg ) ;
       		}
      }
  }

  //cmd.saveIPCamToMp4("ipcam640") ;

  var server = new ws({port: 8081});

  var cams = [] ;
  var clients = [];
  var names = [] ;

  server.on("error", function(websocket) { console.log("error@@") ;})
  console.log("app start") ;
}
else {
  console.log("hi, i am worker, i waitfor message") ;
  process.on('message', function(msg) {

    // decode base64
    var buffer = Buffer.from(msg.rawBase64, 'base64');
    console.log("worker recv rawBase64=" + msg.rawBase64.length) ;
    imagemagick.convert({
        srcData: buffer , // provide a Buffer instance
        width: 256,
        height: 256,
        resizeStyle: "aspectfill",
        quality: 50,
        format: 'JPEG'
    }, function( err, buf ) {

      if ( buf != undefined ) {
        console.log("convert 512 success") ;
        msg.raw512base64 = buf.toString('base64')
        process.send(msg) ;
      }
      else {
        console.log("convert 512 done, err=" + err) ;
        msg.rawBase64 = undefined ;
        process.send(msg) ;// if error, need send once
      }

    });
    // resize image
    // send message back
    //console.log("catch msg !!" + msg.name ) ;
  }) ;
}
