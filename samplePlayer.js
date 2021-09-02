// Main js file.

class CGlobals // Global consts and stuff in here just to be cleaner. Not saved.
{
  constructor()
  {
    this.cursor = new cursorPosition();
    this.currentConfigIx = 1;
    this.sampleLibrary = {}; // object of ClLibrarySample
    this.chordLibrary = []; // array of CChord
    this.editElement = undefined; // What we're editing if "Mode_Edit" Used a lot so keep as it's own var 
    this.currentTempo = 500; // ms
    this.cfg = {}; // The CConfig. This is what is saved.
    this.instruments = {};
    this.fsMode == "NavLR";
    this.editMode = false;
    this.stopFlag = false;
    this.ae = undefined; // The active element being played.
    this.modFilterState = false;
    this.modTremoloState = false;
    this.modChorusState = false;
    this.modDistState = false;
  }
}

CGlobals.MAX_GROUPS = 32;
CGlobals.synthTypes = [ "Piano",
                        "Harp", "Flute", "Cello", "French", "Trumpet", "Violin", "Xylo", "Organ",
                        "Sine", "Square", "Sawtooth", "Triangle", "Bell", 
                        "SynReed", "SynKeys", "Pluck", "SynthPipe", "MiscE", "Noise" ];

CGlobals.arpNPBs = [ 1, 2, 3, 4, 6, 8 ]; // notes per beat
CGlobals.tremRates = [ 1, 2, 4, 8 ]; // trems per beat.
CGlobals.arpSequences = [ "1234", "4321", "1324", "4231", "12324323", "31213141", "B-T", "T-B" ]; 
CGlobals.seqModes = [ "None", "Manual", "Once", "Loop" ];
CGlobals.envelopeLabels = [ "Hard", "Fast", "Med", "Slow" ];
CGlobals.envelopeParams = { Hard : { attack :  0, decay :  0, sustain:   1, release: .1 },
                            Fast : { attack : .1, decay : .1, sustain:  .9, release: .1 },
                            Med  : { attack :  2, decay : .5, sustain: 0.9, release:  2 },
                            Slow : { attack :  5, decay :  2, sustain: 0.9, release:  4 } };

var globals; // a CGlobals to contain everything

class CConfig
{
  constructor( )
  {
    this.name = "Config";
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
  }
}

class CGroup 
{
  constructor( groupName )
  {
    this.objType = "CGroup";
    this.elementName = groupName;

    this.instrument = CGlobals.synthTypes[ 0 ];
    this.chained = false; // is this group a part of a previous group?
    this.thickenFlag = false;
    this.smallFlag = false; // if this is a melody or a sequence display smaller to save space.

    this.tempoMs = 500;
    this.seqMode = CGlobals.seqModes[ 0 ];
    this.arpFlag = false;
    this.arpNPB = 4;
    this.arpSequence = CGlobals.arpSequences[ 0 ];
    this.tremRate = CGlobals.tremRates[ 0 ];
    this.envelope = CGlobals.envelopeLabels[ 0 ];
    this.elements = [];

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

class CChord
{
  constructor( name )
  {
    this.objType = "CChord";
    this.elementName = name;
    this.playing = false;

    this.playBeats = 4; // How many beats to play 
    this.notes = 0x0; // bit field of pressed keys bit 0 is a C
    this.octave = 0;
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
  globals.cfg = new CConfig();

  initWebAudio();
  genButtonHTML();
  initFootswitch();
  getFileFromServer( "samples.json", gotSamples );
  selectConfig();

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

  var volDB = Math.trunc( globals.meterBlock.getValue()[ 0 ] );
  var tempHtml = "-";
  if( volDB > -50 )
    tempHtml = volDB + "dB";

  document.getElementById( 'volumeLevel' ).innerHTML = tempHtml;
}

function clearTempoFlash()
{
  document.getElementById( 'tempoButton' ).classList.remove( 'css_highlight_red' );
}