const fs = require( 'fs' );
//const http = require( 'http' );
const path = require( 'path' );
const express = require( 'express' );
const bodyParser = require( "body-parser" );
const cors = require( 'cors' )
const formidable = require( 'express-formidable' );
const app = express();

const serverPort = 8080;

app.use( cors() );
//app.use( bodyParser.json() );
//app.use( bodyParser.urlencoded( { extended: false } ) );
app.use( formidable() );

// http.createServer( handleReq ).listen( serverPort );

class SampleInfo
{
  constructor( filename )
  {
    this.filename = filename;
    this.displayName = filename;

    this.sampleLength = undefined;
    this.sampleVolume = undefined;
  }
}

function handleReq( req, res )
{
  console.log( "GET:" + req.url );

  if( req.url == '/samples.json' ) // sampler requests this to get a listing of available sample files.
  {
    var samples = {};
    var fileObjs = fs.readdirSync( __dirname + "/samples" );

    for( var i = 0;i < fileObjs.length;i++ )
    {
      // console.log( fileObjs[ i ] );
      var ext = path.extname( fileObjs[ i ] );
      if( ( ext == '.mp3' ) || ( ext == '.wav' ) )
      {
        var sampleInfo = new SampleInfo( fileObjs[ i ] );
        samples[ fileObjs[ i ] ] = sampleInfo;
      }
    }

    res.writeHead( 200 );
    res.end( JSON.stringify( samples ) );
  }
  else
  {
    var ext = path.extname( req.url );
    if( ext == '.mp3' )
      req.url = "/samples" + req.url;

    try
    {
      var file = fs.readFileSync(  __dirname + req.url );
    }
    catch
    {
      console.log( "File doesn't exist:" + req.url );
    }

    if( file )
    {
      res.writeHead( 200 );
      res.end( file );
    }
    else
    {
      res.writeHead( 404 );
      res.end( "?" );
      console.log( "  Failed." );
    }
  }
}

function handlePost( req, res )
{
  console.log( "POST:" + req.url );
  // console.log( req.fields.data );

  // let data = JSON.stringify( req.fields.data, null, 2 );
  fs.writeFileSync( __dirname + req.url, req.fields.data );
  res.end();
}

app.get( '/*', handleReq );
app.post( '/*', handlePost );

app.listen( serverPort, () => { console.log( 'Server is running' ); } );