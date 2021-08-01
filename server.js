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
    this.filename = filename; // path
    this.displayName = filename.substring( filename.lastIndexOf( "/" ) + 1 );

    this.sampleLength = undefined;
    this.sampleVolume = undefined;
  }
}

function genSamples()
{
  var samples = {};
  var fileObjs = fs.readdirSync( __dirname + "/samples" );

  for( var i = 0;i < fileObjs.length;i++ )
  {
    var ext = path.extname( fileObjs[ i ] );
    if( ( ext == '.mp3' ) || ( ext == '.wav' ) )
    {
      var sampleInfo = new SampleInfo( /* __dirname + */ "samples/" + fileObjs[ i ] );
      samples[ fileObjs[ i ] ] = sampleInfo;
    }
  }
  return samples;
}

function handleReq( req, res )
{
  console.log( "GET:" + req.url );

  if( req.url == 'samples.json' ) // sampler requests this to get a listing of available sample files.
  {
    var samples = genSamples();

    res.writeHead( 200 );
    res.end( JSON.stringify( samples ) );
  }
  else
  {
    var ext = path.extname( req.url );

    try
    {
      var file = fs.readFileSync(  __dirname + req.url );
      //var file = fs.readFileSync( req.url );
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

// save samples.json locally so even if Nodejs isn't running a configuration could work on the server.
// by servering the actual samples.json file vs generating it.
fs.writeFileSync( 'samples.json', JSON.stringify( genSamples(), null, 2 ) );

app.listen( serverPort, () => { console.log( 'Server is running' ); } );