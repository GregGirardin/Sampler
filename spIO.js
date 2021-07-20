///////////////////////// ///////////////////////// /////////////////////////
// file IO
///////////////////////// ///////////////////////// /////////////////////////

var serverURL = 'http://192.168.0.2:8080/'; // this is where samples.json and all the samples live.
// var serverURL = 'https://greggirardin.github.io/samples/';
// Can specify in URL. https://setlist.loc.com/?serverURL='https://your.samples.loc/path/to/stuff'

const configFile = 'sampleConfig.json';
const synthConfigFile = 'synthConfig.json';

function gotSamples( file, data )
{
  sampleLibrary = JSON.parse( data );
  generateLibraryHTML();
}

function gotConfig( file, data )
{
  if( data )
  {
    curConfig = JSON.parse( data );
    genElementConfigHTML();
  }
  else
    console.log( "No config." );
}

function gotSynthLib( file, data )
{
  if( data )
  {
    synthLibrary = JSON.parse( data );
    genSynthLibraryHTML();
    genElementConfigHTML();
  }
  else
    console.log( "No Synth Library." );
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

  xhr.onerror = function( e ) {
    callback( filename, false );
  }

  xhr.ontimeout = function( e ) {
    callback( filename, false );
  }

  xhr.send( null );
}

/////////////// /////////////// /////////////// /////////////// ///////////////
// Save the current config
/////////////// /////////////// /////////////// /////////////// ///////////////
function sampleConfigSave()
{
  saveEdits();

  if( configEditedFlag )
  {
    var configData = JSON.stringify( curConfig, null, "  " );

    var formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + configFile );
    xhr.send( formData );

    configEditedFlag = false;
  }

  if( synthEditedFlag ) // Save the Synth Library.
  {
    configData = JSON.stringify( synthLibrary, null, "  " );
    formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + synthConfigFile );
    xhr.send( formData );
    synthEditedFlag = false;
  }

  document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  return true;
}