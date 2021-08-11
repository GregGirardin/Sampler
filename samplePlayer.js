// Main js file.

class CGlobals // Global consts and stuff in here just to be cleaner.
{
  constructor()
  {
    this.cursor = new cursorPosition();
    this.configEditedFlag = false;
    this.chordEditedFlag = false;
    this.sampleLibrary = {}; // object of ClLibrarySample
    this.chordLibrary = []; // array of CChord
    this.editElement = {}; // What we're editing if "Mode_Edit" Used a lot so keep as it's own var 
    this.currentTempo = 500;
    this.cfg = {}; // The CConfig
    this.instruments = {};
    this.fsMode == "";
    this.editMode = false;
  }
}

CGlobals.MAX_GROUPS = 32;
CGlobals.synthTypes = [ "Piano",
                        "Harp", "Flute", "Cello", "French", "Trumpet", "Violin", "Xylo", "Organ",
                        "Sine", "Square", "Sawtooth", "Triangle", "Bell", 
                        "SynReed", "SynKeys", "Pluck", "SynthPipe", "MiscE", "Noise" ];

CGlobals.arpNPBs = [ 1, 2, 3, 4, 6, 8 ]; // notes per beat
CGlobals.tremRates = [ 1, 2, 4, 8 ]; // trems per beat.
CGlobals.playBeats = [ 1, 2, 4, 8, 16, 32 ];
CGlobals.arpSequences = [ "1234", "4321", "1324", "4231", "12324323", "B-T", "T-B" ]; 
CGlobals.seqModes = [ "None", "Manual", "Cont" ];
CGlobals.envelopeLabels = [ "Fast", "Med", "Slow" ];
CGlobals.envelopeParams = { Fast : { attack : .1, decay :  0, sustain:    1, release: .1 },
                            Med  : { attack :  2, decay :  1, sustain: 0.95, release:  2 },
                            Slow : { attack :  5, decay : .9, sustain: 0.95, release:  4 } };

var globals; // a CGlobals to contain everything

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

class cursorPosition
{
  constructor()
  {
    this.cg = 0; // current group, element
    this.ce = 0;
    this.sg = undefined; // subgroup.  If these are defined, we're playing a group (subGroup)
    this.se = undefined; //            inside of another group (currentGroup)
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
    this.seqMode = CGlobals.seqModes[ 0 ];
    this.arpFlag = false;
    this.arpNPB = 4;
    this.arpSequence = CGlobals.arpSequences[ 0 ];
    this.tremRate = CGlobals.tremRates[ 0 ];
    this.envelope = CGlobals.envelopeLabels[ 0 ];
    this.elements = []; // CSample, CChordRef, CGroupRef.

    this.masterLevel = 100;
    this.distortionLevel = 0;
    this.chorusLevel = 0;
    this.phaserLevel = 0;
    this.tremoloLevel = 0;
    this.dryLevel = 100;
    this.reverbLevel = 0;
    this.delayLevel = 0;
    this.flashTempoTimer = undefined;
    this.clearTempoTimer = undefined;

    this.modFilterState = false;
    this.modTremoloState = false;
    this.modChorusState = false;
    this.modDistState = false;
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

window.onload = sampleListInit; // main entry point

/////////////// /////////////// /////////////// ///////////////
function sampleListInit()
{
  // const urlParams = new URLSearchParams( window.location.search );
  // var server = urlParams.get( 'serverURL' );
  // if( server ) // Server URL provided by user
  // {
  //   serverURL = server;
  //   console.log( "Server URL:" + serverURL );
  // }

  globals = new CGlobals();

  globals.configEditedFlag = false;
  globals.cfg = new CConfig( "Sample List" );

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
  if( globals.clearTempoTimer )
    clearTimeout( globals.clearTempoTimer );
  if( globals.flashTempoTimer )
    clearTimeout( globals.flashTempoTimer );

  document.getElementById( 'tempoButton' ).classList.add( 'css_highlight_red' );

  globals.clearTempoTimer = setTimeout( clearTempoFlash, 100 );
  globals.flashTempoTimer = setTimeout( flashTempo, globals.currentTempo );
}

function clearTempoFlash()
{
  document.getElementById( 'tempoButton' ).classList.remove( 'css_highlight_red' );
}