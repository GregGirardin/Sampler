// Main js file.

var configEditedFlag = false;
var synthEditedFlag = false;
var sampleLibrary = {}; // object of ClLibrarySample
var synthLibrary = []; // object of CSynth
var curConfig;

var editElement; // What we're editing if "Mode_Edit"

var didNavFlag = false;

// Constants.
const MAX_GROUPS = 10;

var operationMode = "Mode_Default";
var fsMode = "PM"; 
var cursorGroup = 0, cursorElement = 0; // cursor

var loopTypes = [ "Once", "Repeat" ];
var seqTypes = [ "None",
                 "Next",  // move to the next sample in the group
                 "Cont" ]; // keep playing from one sample to the next.

class CSample
{
  constructor( filename )
  {
    this.objType = "CSample";
    this.elementName = filename;
    this.playing = false;

    this.filename = filename; // filename on the server.
    this.fadeInTime = 0; // Milliseconds
    this.fadeOutTime = 0;
    this.loopType = loopTypes[ 0 ];
    this.volume = 100;
    this.duration = "?";
  }
}

class CGroup
{
  constructor( groupName )
  {
    this.objType = "CGroup";

    this.elementName = groupName;
    this.seqType = "None"; // None, Single, Loop
    this.elements = []; // CSample, CChord, etc.
  }
}

class CSampleConfig
{
  constructor( sampListName )
  {
    this.name = sampListName;
    this.sampleBaseURL = undefined; // The prefix of the path to all the samples
    this.groups = [];
    this.groups.push( new CGroup( "Group" ) );
    this.groups.push( new CGroup( "Clipboard" ) );
  }
}

var audioContext;

//////////////////////////// ////////////////////////////
//////////////////////////// ////////////////////////////
window.onload = sampleListInit; // set up main entry point

/////////////// /////////////// /////////////// ///////////////
function sampleListInit()
{
  const urlParams = new URLSearchParams( window.location.search );
  var server = urlParams.get( 'serverURL' );
  if( server ) // Server URL provided by user
    serverURL = server;

  configEditedFlag = false;
  curConfig = new CSampleConfig( "Sample List" );

  getFileFromServer( "samples.json", gotSamples );
  getFileFromServer( configFile, gotConfig );
  getFileFromServer( "synthLib.json", gotSynthLib );

  document.getElementById( 'serverURL' ).value = serverURL;
  document.getElementById( 'serverURL' ).addEventListener( 'change', changeURL, false );

  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup', keyRelHandler );

  footSwitchButtons[ 0 ] = new FootSwitchButton( "BUTTON1" );
  footSwitchButtons[ 1 ] = new FootSwitchButton( "BUTTON2" );

  genSynthLibraryHTML();
}

function stopAllAudio() // go through all groups / elements and call stopAudio.
{
  for( var g = 0;g < curConfig.groups.length;g++ )
    for( var s = 0;s < curConfig.groups[ g ].elements.length;s++ )
      stopAudio( curConfig.groups[ g ].elements[ s ] );
}

function stopAudio( element )
{
  if( element.playing )
  {
    element.playing = false;
    if( element.id )
    {
      var elem = document.getElementById( element.id );
      elem.classList.remove( 'css_playing' );
    }
    if( element.objType == "CSample" )
      element.audioFile.pause();
    else if( element.objType == "CSynth" )
    {
      masterGain.gain.value = 0.0;

      for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
        if( audioSource[ sourceIx ] )
          audioSource[ sourceIx ].source.disconnect();
    }
  }
}

function playEndedCB( ev )
{
  stopAudio( this.sampleObj );
  if( this.sampleObj.playNext && !didNavFlag )
    playElement( "START" );
}
