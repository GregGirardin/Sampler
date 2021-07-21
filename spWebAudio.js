/* Using Tone.js for Web Audio API

    S0 S1 S2.. : Audio / Synth sources.
    |  |  | TBD pan/level per voice
    |/___/
    |
  Compressor
    |
  Master Gain <- The volume
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
    |         Reverb   Delay <- Parallel FX
    |         |        |
    |         /       /
    Out  <-----------  
*/

const synthTypes = [ "None", "piano", "sine", "square", "sawtooth", "triangle" ];

class CSample // A Sample in the config.
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

// Synth is handled opposite of samples in that most information about the synth
// is in the library, not in the current config.

class CSynth // A synth in the config. Just a name referring to the CLibSynth
{
  constructor( name )
  {
    this.objType = "CSynth";
    this.elementName = name; // name of a CLibSynth in the library
    this.playing = false;
  }
}

class CLibSynth // synthesized chords w/ Web Audio API generated sounds
{
  constructor( name )
  {
    this.objType = "CLibSynth";
    this.elementName = name;

    this.notes = 0x0; // bit field of pressed keys bit 0 is a C
    this.instrument = synthTypes[ 0 ];
    this.octave = 0;

    // Levels are 0-100
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

const NUM_SOURCES = 4;
const EFFECT_REVERB = 0;
const EFFECT_DELAY = 1;
const EFFECT_LAST = 1;

var audioSource = []; // Use a PolySynth?
var masterLevel, dryLevel, reverbLevel, delayLevel;
var reverbBlock, delayBlock, tremoloBlock, phaserBlock,
    chorusBlock, distortionBlock, compressorBlock;
var samplers = {};
var activeSampler = undefined;

function initWebAudio()
{
  // build chain from bottom up
  reverbBlock = new Tone.Reverb( { decay : 10, wet : 1 } ).toDestination();
  delayBlock = new Tone.FeedbackDelay( { delayTime : .4, feedback : 0.5, wet : 1 } ).toDestination();

  dryLevel = new Tone.Gain().toDestination();
  reverbLevel = new Tone.Gain().connect( reverbBlock );
  delayLevel = new Tone.Gain().connect( delayBlock );

  tremoloBlock = new Tone.Tremolo( { frequency : 1, depth : 1 } ).start();
  tremoloBlock.connect( dryLevel );
  tremoloBlock.connect( delayLevel );
  tremoloBlock.connect( reverbLevel );
  tremoloBlock.wet.value = 1;

  phaserBlock = new Tone.Phaser( { frequency : 1, octaves : 3, baseFrequency : 1000 } );
  phaserBlock.wet.value = 1;
  phaserBlock.connect( tremoloBlock );

  chorusBlock = new Tone.Chorus( { frequency : 1, delayTime : 2.5, depth : .5 } );
  chorusBlock.start();
  chorusBlock.wet.value = 0;
  chorusBlock.connect( phaserBlock );

  distortionBlock = new Tone.Distortion( 1 );
  distortionBlock.connect( chorusBlock );
  distortionBlock.wet.value = 0;

  masterLevel = new Tone.Gain().connect( distortionBlock );

  samplers[ 'piano' ] = createSamplerInstrument( 'piano' );
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
      stopSample( element.elementName );
    else if( element.objType == "CSynth" )
      stopSynth();
  }
}

// Play the CSample
function playSample( sampleObj )
{
  var libSample = sampleLibrary[ sampleObj.elementName ]; // the ClLibrarySample
  if( libSample )
  {
    masterLevel.gain.value = sampleObj.masterLevel / 100;
    dryLevel.gain.value = sampleObj.dryLevel / 100;
    delayLevel.gain.value = sampleObj.delayLevel / 100;
    reverbLevel.gain.value = sampleObj.reverbLevel / 100;

    // We put the player in the ClLibrarySample so there is only 1 instance per sample.
    // The same sample may be in multiple groups.
    if( !libSample.player )
    {
      // First time. Need to create the player and connect it.
      libSample.player = new Tone.Player( serverURL + libSample.filename );
      libSample.player.autostart = true;
      libSample.player.connect( masterLevel ); // TBD. For now we never disconnect
    }
    else
      libSample.player.start();

    libSample.player.loop = sampleObj.loopType == "Once" ? false : true;
  }
}

function stopSample( sName )
{
  var libSample = sampleLibrary[ sName ]; // a CSample
  if( libSample )
    if( libSample.player )
      libSample.player.stop(); // TBD. Disconnect it? All samples will remain connected.
}

// Note that this is creating an instrument, not just a "sample".
function createSamplerInstrument( instrument )
{
  var sampler = undefined;

  switch( instrument )
  {
    case "piano":

      sampler = new Tone.Sampler( {
        urls : {
          A0 : "A0.mp3",
          C1 : "C1.mp3",
          "D#1" : "Ds1.mp3",
          "F#1" : "Fs1.mp3",
          A1 : "A1.mp3",
          C2 : "C2.mp3",
          "D#2" : "Ds2.mp3",
          "F#2" : "Fs2.mp3",
          A2 : "A2.mp3",
          C3 : "C3.mp3",
          "D#3" : "Ds3.mp3",
          "F#3" : "Fs3.mp3",
          A3 : "A3.mp3",
          C4 : "C4.mp3",
          "D#4" : "Ds4.mp3",
          "F#4" : "Fs4.mp3",
          A4 : "A4.mp3",
          C5 : "C5.mp3",
          "D#5" : "Ds5.mp3",
          "F#5" : "Fs5.mp3",
          A5 : "A5.mp3",
          C6 : "C6.mp3",
          "D#6" : "Ds6.mp3",
          "F#6" : "Fs6.mp3",
          A6 : "A6.mp3",
          C7 : "C7.mp3",
          "D#7" : "Ds7.mp3",
          "F#7" : "Fs7.mp3",
          A7 : "A7.mp3",
          C8 : "C8.mp3"
        },
        release : 2,
        baseUrl : "https://tonejs.github.io/audio/salamander/",
      } ).connect( masterLevel );

      break;
  }

  return sampler;
}

function synthFromName( sName ) // get the CLibSynth by name
{
  var s = undefined;

  for( var synthIx = 0;synthIx < synthLibrary.length;synthIx++ )
    if( synthLibrary[ synthIx ].elementName == sName )
    {
      s = synthLibrary[ synthIx ];
      break;
    }

  return s;
}

function playSynth( synth ) 
{
  //dryLevel.gain.value = synth.dryLevel / 100; // rampTo( synth.dryLevel / 100, .1 );
  dryLevel.gain.rampTo( synth.dryLevel / 100, .2 );
  delayLevel.gain.rampTo( synth.delayLevel / 100, .2 );
  reverbLevel.gain.rampTo( synth.reverbLevel / 100, .2 );

  var inst = curConfig.groups[ cursorGroup ].instrument; // Group instrument has priority

  if( inst == "None" ) 
    inst = synth.instrument;

  switch( inst ) 
  {
    case "None":
      break;

    case "sine":
    case "square":
    case "sawtooth":
    case "triangle":

      // Oscillators are louder than samplers.
      masterLevel.gain.value = synth.masterLevel / 1000; // 0 - 100

      var sourceIx = 0;
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440

          var freq = 440 * Math.pow( 2, noteOffset / 12 );

          audioSource[ sourceIx ] = new Tone.Oscillator( {
                                                          type : inst,
                                                          frequency : freq,
                                                        } ).connect( masterLevel );
          audioSource[ sourceIx ].start();
  
          sourceIx++;
          if( sourceIx == NUM_SOURCES )
            break;
        }

      break;

    default: // not an oscillator.

      masterLevel.gain.value = synth.masterLevel / 100; // rampTo( synth.dryLevel / 100, .1 );
      notesToPlay = [];
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440
          var freq = 440 * Math.pow( 2, noteOffset / 12 );
          notesToPlay.push( freq );
        }

      activeSampler = samplers[ inst ];
      activeSampler.triggerAttack( notesToPlay );
      break;
    }
  
  return true;
}

function stopSynth()
{
  if( activeSampler )
  {
    activeSampler.triggerRelease();
    activeSampler = undefined;
  }

  for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
    if( audioSource[ sourceIx ] )
    {
      audioSource[ sourceIx ].disconnect();
      audioSource[ sourceIx ] = undefined;
    }
}