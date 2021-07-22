// Main js file.

var configEditedFlag = false;
var synthEditedFlag = false;
var sampleLibrary = {}; // object of ClLibrarySample
var synthLibrary = []; // array of CSynth
var curConfig;

var editElement; // What we're editing if "Mode_Edit"

// Constants.
const MAX_GROUPS = 20;

var cursorGroup = 0, cursorElement = 0; // cursor

const attackTimes = [ "Fast", "Med", "Slow" ]; // 0, 1s, 3s

class CGroup
{
  constructor( groupName )
  {
    this.objType = "CGroup";
    this.instrument = "None";

    this.elementName = groupName;
    this.seqType = "None"; // None, Single, Loop
    this.attackTime = attackTimes[ 0 ];
    this.elements = []; // CSample, CChord, etc.

    this.compressorLevel = 0;
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
  getFileFromServer( synthConfigFile, gotSynthLib );

  document.getElementById( 'serverURL' ).value = serverURL;
  document.getElementById( 'serverURL' ).addEventListener( 'change', changeURL, false );

  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup', keyRelHandler );

  footSwitchButtons[ 0 ] = new FootSwitchButton( "BUTTON1" );
  footSwitchButtons[ 1 ] = new FootSwitchButton( "BUTTON2" );

  genSynthLibraryHTML();
  initWebAudio();
}