// Main js file.

var configEditedFlag = false;
var chordEditedFlag = false;
var sampleLibrary = {}; // object of ClLibrarySample
var chordLibrary = []; // array of CChord
var curConfig;
var editElement; // What we're editing if "Mode_Edit"

var cursorGroup = 0, cursorElement = 0;

const MAX_GROUPS = 32;
const synthTypes = [  "Piano",
                      "Harp", "Flute", "Cello", "French", "Trumpet",
                      "Violin", "Xylo", "Organ",
                      "Sine", "Square", "Sawtooth", "Triangle", "Bell", 
                      "SynReed", "SynKeys", "Pluck", "SynthPipe", "MiscE", "Noise" ];
const arpNPBs = [ 1, 2, 3, 4, 6, 8 ]; // notes per beat
const loopCount = [ 1, 2, 4, 8, 16, 32 ];
const arpSequences = [ "1234", "4321", "1324", "4231", "12324323", "B-T", "T-B" ]; 
const seqModes = [ "None", "Manual", "Cont" ];
const envelopeLabels = [ "None", "Fast", "Med", "Slow" ];
const envelopeParams = {  Fast : { attack : .1, decay :  0, sustain:   1, release: .1 },
                          Med  : { attack : .5, decay :  1, sustain: 0.9, release:  1 },
                          Slow : { attack :  5, decay : .9, sustain: 0.9, release:  3 } };

class CConfig
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

class CGroup
{
  constructor( groupName )
  {
    this.objType = "CGroup";
    this.instrument = "None";
    this.thickenFlag = false;
    this.playing = false;

    this.elementName = groupName;
    this.tempoMs = 500;
    this.seqMode = seqModes[ 0 ];
    this.arpFlag = false;
    this.arpNPB = 4;
    this.arpSequence = arpSequences[ 0 ];
    this.envelope = envelopeLabels[ 0 ];
    this.elements = []; // CSample, CChordRef, CGroupRef.

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

class CGroupRef // a reference to a group that can be placed in a group.
{
  constructor( groupName )
  {
    this.objType = "CGroupRef";
    this.elementName = groupName;
    this.loopFlag = false;
  }
}

class CSample // A Sample in the config.
{
  constructor( filename )
  {
    this.objType = "CSample";
    this.elementName = filename;
    this.filename = filename; // filename on the server.
    this.loopFlag = false;

    this.playing = false;
  }
}

// is in the library, not in the current config.
class CChord // A Chord in the config.
{
  constructor( name )
  {
    this.elementName = name; // name of a CLibChord in the library
    this.objType = "CChord";
    this.playBeats = 4; // How many beats to play 

    this.notes = 0x0; // bit field of pressed keys bit 0 is a C
    this.octave = 0;

    this.playing = false;
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
  {
    serverURL = server;
    console.log( "Server URL:" + serverURL );
  }

  configEditedFlag = false;
  curConfig = new CConfig( "Sample List" );

  getFileFromServer( "samples.json", gotSamples );
  getFileFromServer( configFile, gotConfig );

  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup',   keyRelHandler );

  footSwitchButtons[ 0 ] = new FootSwitchButton( "BUTTON1" );
  footSwitchButtons[ 1 ] = new FootSwitchButton( "BUTTON2" );

  flashTempo();
  initWebAudio();
  changeMode( "NavUD" );

  setTempoMs( 500 );
}

function flashTempo()
{
  if( clearTempoTimer )
    clearTimeout( clearTempoTimer );
  if( flashTempoTimer )
    clearTimeout( flashTempoTimer );

  document.getElementById( 'tempoButton' ).classList.add( 'css_highlight_red' );

  clearTempoTimer = setTimeout( clearTempoFlash, 100 );
  flashTempoTimer = setTimeout( flashTempo, currentTempo );
}

function clearTempoFlash()
{
  document.getElementById( 'tempoButton' ).classList.remove( 'css_highlight_red' );
}