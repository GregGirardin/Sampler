/* Using Tone.js for Web Audio API

    S0 S1 S2.. : Audio / Synth sources.
    |  |  | TBD pan/level per voice
    |/___/
    |
  Master Gain <- The volume
    |
  Filter
    |
  Distortion
    |
  Chorus
    |
  Phaser
    |
  Tremolo
    |
    |\
    | \
    |  \_______________
    |         |        |
    Dry       RGain    DGain <- FX levels
    |         |        |
    |         Reverb   Delay <- Parallel FX so we play trails
    |         |        |
    |         /       /
    Out  <-----------  
*/

const synthTypes = [ "None", "piano", "sine", "square", "sawtooth", "triangle", "noise", "test1", "test2", "test3", "test4", "test5" ];
const arpTypes = [ "None", "Up", "Down", "UpStair", "DownStair" ];

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
class CChord // A synth in the config. Just a name referring to the CLibSynth
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

var audioSource;
var masterLevel, dryLevel, reverbLevel, delayLevel;
var reverbBlock, delayBlock, tremoloBlock, phaserBlock,
    chorusBlock, distortionBlock, filterBlock;
var instruments = {};

function initWebAudio()
{
  // build chain from bottom up
  reverbBlock = new Tone.Reverb( { preDelay : .2, decay : 10, wet : 1 } ).toDestination();
  delayBlock = new Tone.FeedbackDelay( { delayTime : .4, maxDelay : 2, feedback : 0.6, wet : 1 } ).toDestination();

  dryLevel = new Tone.Gain( 1 ).toDestination();
  reverbLevel = new Tone.Gain( 0 ).connect( reverbBlock );
  delayLevel = new Tone.Gain( 0 ).connect( delayBlock );

  tremoloBlock = new Tone.Tremolo( { frequency : 4, depth : 1, wet : 0, spread : 0 } );
  tremoloBlock.connect( dryLevel );
  tremoloBlock.connect( delayLevel );
  tremoloBlock.connect( reverbLevel );

  phaserBlock = new Tone.Phaser( { frequency : .4, octaves : 4, baseFrequency : 700, wet : 0 } );
  phaserBlock.connect( tremoloBlock );

  chorusBlock = new Tone.Chorus( { frequency : .5, delayTime : 2.5, depth : 1, wet : 0 } );
  chorusBlock.connect( phaserBlock );

  distortionBlock = new Tone.Chebyshev( 10 );
  distortionBlock.connect( chorusBlock );
  distortionBlock.wet.value = 0;

  filterBlock = new Tone.Filter( 20000, "lowpass" );
  filterBlock.connect( distortionBlock );

  masterLevel = new Tone.Gain( 0 );
  masterLevel.connect( filterBlock );

  createSynths();
}

function initWebAudio2() // stuff we can't do until a user click
{
  tremoloBlock.start();
  chorusBlock.start();
}

function createSynths() // create all synths and connect them to masterLevel
{
  // Oscillators are louder than samplers so we normalize volumes.

  for( var ix = 0;ix < synthTypes.length;ix++ )
  {
    var sType = synthTypes[ ix ];

    switch( sType )
    {
      case "piano":
        s = new Tone.Sampler( { urls : {  A0 : "A0.mp3",
                                          C1 : "C1.mp3", "D#1" : "Ds1.mp3", "F#1" : "Fs1.mp3", A1 : "A1.mp3",
                                          C2 : "C2.mp3", "D#2" : "Ds2.mp3", "F#2" : "Fs2.mp3", A2 : "A2.mp3",
                                          C3 : "C3.mp3", "D#3" : "Ds3.mp3", "F#3" : "Fs3.mp3", A3 : "A3.mp3",
                                          C4 : "C4.mp3", "D#4" : "Ds4.mp3", "F#4" : "Fs4.mp3", A4 : "A4.mp3",
                                          C5 : "C5.mp3", "D#5" : "Ds5.mp3", "F#5" : "Fs5.mp3", A5 : "A5.mp3",
                                          C6 : "C6.mp3", "D#6" : "Ds6.mp3", "F#6" : "Fs6.mp3", A6 : "A6.mp3",
                                          C7 : "C7.mp3", "D#7" : "Ds7.mp3", "F#7" : "Fs7.mp3", A7 : "A7.mp3",
                                          C8 : "C8.mp3" },
                                release : 4,
                                baseUrl : "https://tonejs.github.io/audio/salamander/" } );
        break;

      case "sine":
      case "square":
      case "sawtooth":
      case "triangle":
        s = new Tone.PolySynth( Tone.Synth, { polyphony : 12, oscillator: { partials : [ 0, 2, 3, 6 ], } } );
        s.set( {  volume : -12, oscillator : { type : sType }, } );
        break;

      case "test1":
        s = new Tone.PolySynth( Tone.AMSynth );
        s.set( {  polyphony : 24,
                  volume : -6,
                  harmonicity : 3.999,
                  oscillator : { type: "square" },
                  envelope : { attack: 0.03, decay: 0.3, sustain: 0.7, release: 0.8 },
                  modulation : { volume: 12, type: "square6" },
                  modulationEnvelope : { attack: 2, decay: 3, sustain: 0.8, release: 0.1 } } );
        break;

      case "test2":
        s = new Tone.PolySynth( Tone.Synth );
        s.set( {  polyphony : 12,
                  volume : -6,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } });
        break;

      case "test3":
        s = new Tone.PolySynth( Tone.AMSynth );
        s.set( {  polyphony : 12,
                  volume : 0,
                  harmonicity : 2,
                  oscillator : { type: "amsine2", modulationType: "sine", harmonicity: 1.01 },
                  envelope : { attack: 0.006, decay: 4, sustain: 0.04, release: 1.2 },
                  modulation : { volume: 13, type: "amsine2", modulationType: "sine", harmonicity: 12 },
                  modulationEnvelope : { attack: 0.006, decay: 0.2, sustain: 0.2, release: 0.4 } } );
        break;
      
      case "test4":
        s = new Tone.PolySynth( Tone.FMSynth );
        s.set( {  polyphony : 24,
                  volume : -6,
                  harmonicity : 3.01,
                  modulationIndex : 14,
                  oscillator : { type: "triangle" },
                  envelope : { attack: 0.2, decay: 0.3, sustain: 0.9, release: 1.2 },
                  modulation : { type: "square" },
                  modulationEnvelope : { attack: 0.01, decay: 0.5, sustain: 0.2, release: 0.1 } } );
        break;
  
      case "test5":
        s = new Tone.PolySynth( Tone.Synth );
        s.set({ volume : -8,
                oscillator: { type: "fatsine4", spread: 60, count: 10 },
                envelope: { attack: 0.4, decay: 0.01, sustain: 1, attackCurve: "sine", releaseCurve: "sine", release: 0.4 } });
        break;

      case "noise":
        s = new Tone.NoiseSynth( {  volume : -18 } );
        break;

      default:
        continue;
    }

    s.connect( masterLevel );
    instruments[ sType ] = s;
  }
}

function releaseAudio()
{
  if( activeElement )
  {
    activeElement.elem.playing = false;

    if( activeElement.elem.objType == "CSample" )
    {
      var libSample = sampleLibrary[ activeElement.elem.elementName ]; // a CSample
      if( libSample )
        if( libSample.player )
          libSample.player.stop();
    }
    else if( activeElement.elem.objType == "CChord" )
      activeElement.synth.triggerRelease( activeElement.notes );
    playComplete( activeElement.elem );
  }

  activeElement = undefined;
}

function setEffectLevels( grp, rampTime )
{
  masterLevel.gain.rampTo( grp.masterLevel / 100, rampTime );
  dryLevel.gain.rampTo( grp.dryLevel / 100, rampTime );
  delayLevel.gain.rampTo( grp.delayLevel / 100, rampTime );
  reverbLevel.gain.rampTo( grp.reverbLevel / 100, rampTime );
  tremoloBlock.wet.rampTo( grp.tremoloLevel / 100, rampTime );
  phaserBlock.wet.rampTo( grp.phaserLevel / 100, rampTime );
  chorusBlock.wet.rampTo( grp.chorusLevel / 100, rampTime );
  distortionBlock.wet.rampTo( grp.distortionLevel / 100, rampTime );
}

var firstTime = true;

var activeElement;

function samplePlayCompleteCB()
{
  if( activeElement )
  {
    activeElement.elem.playing = false;
    playComplete( activeElement.elem );
    //activeElement = undefined;
  }
}

function playElemAudio( elem )
{
  if( firstTime )
  {
    initWebAudio2();
    firstTime = false;
  }

  if( activeElement )
    releaseAudio();

  activeElement = {};
  activeElement.elem = elem;

  saveEdits();
  setEffectLevels( curConfig.groups[ elem.group ], 0 );

  elem.playing = true;

  if( elem.objType == "CSample" )
  {
    var libSample = sampleLibrary[ elem.elementName ]; // the ClLibrarySample
    var p;

    if( libSample )
    {
      if( !libSample.player )
      {
        // We put the Player in the ClLibrarySample so there is only 1 instance per sample.
        // The same sample may be in multiple groups.
        // First time we need to create the player and connect it.
        p = new Tone.Player( serverURL + libSample.filename );
        p.volume.level = 0;
        p.onstop = samplePlayCompleteCB;
        p.autostart = true;
        p.connect( masterLevel );
        libSample.player = p;
      }
      else
      {
        libSample.player.start();
        p = libSample.player;
      }

      var at = curConfig.groups[ elem.group ].envelope;
      if( at == envelopeLabels[ 1 ] )
      {
        p.fadeIn = 1;
        p.fadeOut = 1;
      }
      else if( at == envelopeLabels[ 2 ] )
      {
        p.fadeIn = 5;
        p.fadeOut = 5;
      }
      else // Default / Fast
      {
        p.fadeIn = 0;
        p.fadeOut = 0;
      };

      libSample.player.loop = elem.loopFlag;
    }
  }
  else if( elem.objType == "CChord" )
  {
    var inst = curConfig.groups[ elem.group ].instrument; // Group instrument has priority

    chord = chordFromName( elem.elementName ); // from the chord Lib

    if( inst == "None" ) 
      inst = chord.instrument; // chords can have a default instrument

    var frequencies = [];
    if( inst != "noise" )
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( chord.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + chord.octave * 12; // semitone offset from A440
          var freq = 440 * Math.pow( 2, noteOffset / 12 );
          var voices = curConfig.groups[ cursorGroup ].thickenFlag ? [ freq *.996, freq, freq * 1.004 ] : [ freq ]; // detuned voices for thickness
          frequencies = frequencies.concat( voices );
        }

    if( curConfig.groups[ cursorGroup ].envelope != "None" ) // instrument may have a default envelope
      instruments[ inst ].set( { envelope : envelopeParams[ curConfig.groups[ cursorGroup ].envelope ] } );
    activeElement.synth = instruments[ inst ];
    activeElement.notes = frequencies;
    instruments[ inst ].triggerAttack( frequencies );
  }
}

function doFilterAction( action )
{
  switch( action )
  {
    case "off":
      filterBlock.type = "lowpass";
      filterBlock.frequency.rampTo( 15000, 2 );
      break;

    case "low":
      filterBlock.frequency.rampTo( 200, 1 );
      break;

    case "hi":
      filterBlock.frequency.rampTo( 10000, 1 );
      break;

    case "type":
      switch( filterBlock.type )
      {
        case "lowpass":
          filterBlock.type = "bandpass";
          break;
    
        case "bandpass":
          filterBlock.type = "lowpass";
          break;
      }
     break;
  }
}

function chordFromName( cName ) // get the CLibChord by name
{
  var s = undefined;

  for( var chordIx = 0;chordIx < chordLibrary.length;chordIx++ )
    if( chordLibrary[ chordIx ].elementName == cName )
    {
      s = chordLibrary[ chordIx ];
      break;
    }

  return s;
}