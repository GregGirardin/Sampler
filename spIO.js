///////////////////////// ///////////////////////// /////////////////////////
// file IO
///////////////////////// ///////////////////////// /////////////////////////

var serverURL = 'http://127.0.0.1:8080/'; // this is where samples.json and all the samples live.

function configFileName()
{
  var fName = 'configs/synthConfig_' + globals.currentConfigIx + '.json';
  return fName;
}

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
    globals.cfg = new CConfig();

  configEdited( false );

  genConfigNameDiv();
  genElementConfigHTML();
}

function getFileFromServer( filename, callback )
{
  var xhr = new XMLHttpRequest();

  xhr.overrideMimeType( "application/json" );
  xhr.open( "GET", serverURL + filename, true );
  xhr.onreadystatechange = function()
  {
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
  xhr.open( 'post', serverURL + configFileName() );
  xhr.send( formData );

  configEdited( false );

  return true;
}