/* Web Audio API using Tone.js

  S0 S1 S2.. :  Audio sources.
  |  |  | TBD pan/level per voice
  |/___/
  |
Master Gain <- The volume
  |
  |
  Chorus
  |
  Phaser
  |
  Panner
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
    this.duration = "?";

    this.masterLevel = 100;
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
    this.masterLevel = 100;
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
var masterLevel, reverbBlock, delayBlock, tremoloBlock, dryLevel, reverbLevel, delayLevel;
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

  tremoloBlock = new Tone.Tremolo( 1, 1 );
  tremoloBlock.connect( dryLevel );
  tremoloBlock.connect( delayLevel );
  tremoloBlock.connect( reverbLevel );
  tremoloBlock.start();

  masterLevel = new Tone.Gain().connect( tremoloBlock );

  samplers[ 'piano' ] = createSamplerInstrument( 'piano' );
  waInitialized = true;
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

function playEndedCB( ev )
{
  stopAudio( this.sampleObj );
  if( this.sampleObj.playNext && !didNavFlag )
    playElement( "START" );
}

function stopSynth()
{
  if( activeSampler )
  {
    activeSampler.triggerRelease( );
    activeSampler = undefined;
  }

  for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
    if( audioSource[ sourceIx ] )
    {
      audioSource[ sourceIx ].disconnect();
      audioSource[ sourceIx ] = undefined;
    }

  masterLevel.gain.value = 0; 
}

// Note that this is creating an instrument, not just a "sample".
function createSamplerInstrument( instrument )
{
  var sampler = undefined;

  switch( instrument )
  {
    case "piano":

      sampler = new Tone.Sampler( {
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          "D#1": "Ds1.mp3",
          "F#1": "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          "D#2": "Ds2.mp3",
          "F#2": "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          "D#3": "Ds3.mp3",
          "F#3": "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          "D#4": "Ds4.mp3",
          "F#4": "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          "D#5": "Ds5.mp3",
          "F#5": "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          "D#6": "Ds6.mp3",
          "F#6": "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          "D#7" : "Ds7.mp3",
          "F#7" : "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3"
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
      } ).connect( masterLevel );

      break;
  }

  return sampler;
}

// Play the CSample
function playSample( sampleObj )
{
  // if( !loopFlag )
  //   af.onended = playEndedCB;

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

var waInitialized = false;

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

function playSynth( sName ) 
{
  if( !waInitialized )
  {
    initWebAudio();
    return;
  }
  stopSynth();

  synth = synthFromName( sName );
  if( !synth )
    return false;

  masterLevel.gain.value = synth.masterLevel / 100; // rampTo( synth.dryLevel / 100, .1 );
  dryLevel.gain.value = synth.dryLevel / 100; // rampTo( synth.dryLevel / 100, .1 );
  delayLevel.gain.value = synth.delayLevel / 100; //rampTo( synth.delayLevel / 100, .2 );
  reverbLevel.gain.value = synth.reverbLevel / 100; //rampTo( synth.reverbLevel / 100, .2 );

  var inst = synth.instrument;

  if( inst == "None" ) 
    inst = curConfig.groups[ cursorGroup ].instrument;

  switch( synth.instrument ) 
  {
    case "None":
      break;

    case "sine":
    case "square":
    case "sawtooth":
    case "triangle":
  
      var sourceIx = 0;
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440

          var freq = 440 * Math.pow( 2, noteOffset / 12 );

          audioSource[ sourceIx ] = new Tone.Oscillator( {
                                                          type : synth.instrument,
                                                          frequency : freq,
                                                        } ).connect( masterLevel );
          audioSource[ sourceIx ].start();
  
          sourceIx++;
          if( sourceIx == NUM_SOURCES )
            break;
        }
 
      masterGain.gain.value = .1 * synth.volume / 100; // 0 - 100
      break;

    default: // not an oscillator.
      notesToPlay = [];
      for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
        if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
        {
          var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440
          var freq = 440 * Math.pow( 2, noteOffset / 12 );
          notesToPlay.push( freq );
        }

      activeSampler = samplers[ synth.instrument ];
      activeSampler.triggerAttack( notesToPlay );
      break;
    }
  
  return true;
}