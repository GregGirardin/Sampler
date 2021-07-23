// Main js file.

var configEditedFlag = false;
var chordEditedFlag = false;
var sampleLibrary = {}; // object of ClLibrarySample
var chordLibrary = []; // array of CChord
var curConfig;

var editElement; // What we're editing if "Mode_Edit"

// Constants.
const MAX_GROUPS = 32;

var cursorGroup = 0, cursorElement = 0; // cursor

const envelopeLabels = [ "Fast", "Med", "Slow" ]; // Just hardcode some envelopes. We can expose all the params if we need to.
const envelopeParams =
{
  Fast : { attack : .1, decay : 0, sustain: 1, release: .1 },
  Med : { attack : .5, decay : 1, sustain: 0.9, release: 1 },
  Slow : { attack : 5, decay : .9, sustain: 0.9, release: 3 },
}

class CGroup
{
  constructor( groupName )
  {
    this.objType = "CGroup";
    this.instrument = "None";
    this.thickenFlag = false;

    this.elementName = groupName;
    this.sequence = false;
    this.envelope = envelopeLabels[ 0 ];
    this.elements = []; // CSample, CChord, etc.

    this.masterLevel = 100;
    this.distortionLevel = 0;
    this.chorusLevel = 0;
    this.phaserLevel = 0;
    this.tremoloLevel = 0;
    this.dryLevel = 100;
    this.reverbLevel = 0;
    this.delayLevel = 0;
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
  getFileFromServer( chordConfigFile, gotChordLib );

  document.getElementById( 'serverURL' ).value = serverURL;
  document.getElementById( 'serverURL' ).addEventListener( 'change', changeURL, false );

  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup', keyRelHandler );

  footSwitchButtons[ 0 ] = new FootSwitchButton( "BUTTON1" );
  footSwitchButtons[ 1 ] = new FootSwitchButton( "BUTTON2" );

  genChordLibraryHTML();
  initWebAudio();
}