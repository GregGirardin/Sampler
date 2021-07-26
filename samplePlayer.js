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

const synthTypes = [ "None", "piano", "sine", "square", "sawtooth", "triangle", "noise", "test1", "test2", "test3", "test4", "test5" ];
const arpSpeeds = [ "1x", "2x", "3x", "4x" ];
const arpSequences = [ "1234", "4321", "1324", "4231" ];
const envelopeLabels = [ "None", "Fast", "Med", "Slow" ]; // Just hardcode some envelopes. We can expose all the params if we need to.

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
    this.arpSpeed = arpSpeeds[ 0 ];
    this.arpSequence = arpSequences[ 0 ];
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

class CSample // A Sample in the config.
{
  constructor( filename )
  {
    this.objType = "CSample";
    this.elementName = filename;
    this.playing = false;

    this.filename = filename; // filename on the server.
    this.loopFlag = false;
  }
}

// Synth is handled opposite of samples in that most information about the synth
// is in the library, not in the current config.
class CChord // A Chord in the config. Just a name referring to the CLibChord
{
  constructor( name )
  {
    this.objType = "CChord";
    this.elementName = name; // name of a CLibChord in the library
    this.playing = false;
  }
}

class CLibChord
{
  constructor( name )
  {
    this.objType = "CLibChord";
    this.elementName = name;

    this.notes = 0x0; // bit field of pressed keys bit 0 is a C
    this.instrument = synthTypes[ 0 ]; // can provide a default instrument if not in Group
    this.octave = 0;
  }
}

//////////////////////////// ////////////////////////////
window.onload = sampleListInit; // set up main entry point

var currentTempo;
var flashTempoTimer, clearTempoTimer;

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

  setTempoMs( 500 );

  flashTempoTimer = setTimeout( flashTempo, currentTempo );
  initWebAudio();
}

function flashTempo()
{
  document.getElementById( 'tempoButton' ).classList.add( 'css_highlight_red' );

  clearTempoTimer = setTimeout( clearTempoFlash, 100 );
  flashTempoTimer = setTimeout( flashTempo, currentTempo );
}

function clearTempoFlash()
{
  document.getElementById( 'tempoButton' ).classList.remove( 'css_highlight_red' );
}