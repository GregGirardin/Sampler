var fs = require( 'fs' );
var http = require( 'http' );
var path = require('path');

const serverPort = 8080;

http.createServer( handleReq ).listen( serverPort );

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
  //console.log( req.url );

  if( req.url == '/samples.json' ) // sampler requests this to get a listing of available sample files.
  {
    var samples = {};
    var fileObjs = fs.readdirSync(__dirname );

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
      console.log( "Serving:" + req.url );
      
      res.writeHead( 200 );
      res.end( file );
    }
    else
    {
      res.writeHead( 404 );
      res.end( "?" );
    }
  }
}

console.log( "Sample server listening on:" + serverPort );
