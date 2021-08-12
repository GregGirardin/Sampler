///////////////////////// ///////////////////////// /////////////////////////
// file IO
///////////////////////// ///////////////////////// /////////////////////////

var serverURL = 'http://127.0.0.1:8080/'; // this is where samples.json and all the samples live.

const configFile = 'sampleConfig.json';

function gotSamples( file, data )
{
  globals.sampleLibrary = JSON.parse( data );
  generateLibraryHTML();
}

function gotConfig( file, data )
{
  if( data )
    globals.cfg = JSON.parse( data );
  else
    console.log( "No config." );

  genElementConfigHTML();
  changeMode( "NavLR" ); // FS mode has a behavioral dependency on the config so must be done here.
}

function getFileFromServer( filename, callback )
{
  var xhr = new XMLHttpRequest();

  xhr.overrideMimeType( "application/json" );
  xhr.open( "GET", serverURL + filename, true );
  xhr.onreadystatechange = function() {
    if ( xhr.readyState === 4 )
      if( xhr.status == "200" )
        callback( filename, xhr.responseText );
      else
        callback( filename, false ); // Error, file not present probably.
  }

  xhr.onerror = function( e ) { callback( filename, false ); }
  xhr.ontimeout = function( e ) { callback( filename, false ); }
  xhr.send( null );
}

/////////////// /////////////// /////////////// /////////////// ///////////////
// Save the current config
/////////////// /////////////// /////////////// /////////////// ///////////////
function sampleConfigSave()
{
  saveEdits();

  if( globals.configEditedFlag )
  {
    // clear any state that shouldn't be saved in the config json.
    for( var i = 0;i < globals.cfg.groups.length;i++ )
    {
      var g = globals.cfg.groups[ i ];
      for( var j = 0;j < g.elements.length;j++ )
        g.elements[ j ].playing = undefined;
    }

    var configData = JSON.stringify( globals.cfg, null, "  " );
    var formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + configFile );
    xhr.send( formData );

    globals.configEditedFlag = false;
  }

  if( globals.chordEditedFlag )
  {
    configData = JSON.stringify( globals.chordLibrary, null, "  " );
    formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + chordConfigFile );
    xhr.send( formData );
    globals.chordEditedFlag = false;
  }

  document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  return true;
}