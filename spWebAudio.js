/* Web Audio API using Tone.js

    S0 S1 S2.. :  Audio sources. Single dry amount and a wet send for each parallel effect
    |  |  | TBD pan/level per voice
    |/___/
    |
  Master Gain <- The volume
    |\
    | \
    |  \_________
    |   |        |
    |  RGain    DGain <- FX levels
    |   |        |
    |  Reverb   Delay <- Parallel FX
    |   |        |
    |   /       /
   Out  <------   
  */

const synthTypes = [ "None", "piano", "sine", "square", "sawtooth", "triangle" ];

class CSynth
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
    this.duration = 0; // ms.
    this.reverbSend = 0; // 0-100
    this.delaySend = 0;
    this.volume = 100;
  }
}

const NUM_SOURCES = 4;
const EFFECT_REVERB = 0;
const EFFECT_DELAY = 1;
const EFFECT_LAST = 1;

var audioSource = []; // Use a PolySynth?
var masterGain;
var audioEffectGain = []; // parallel effects levels
var samplers = {};
var activeSampler = undefined;

function initWebAudio()
{
  var audioEffect = []; // parallel effects

  masterGain = new Tone.Gain().toDestination(); // dry out.
  audioEffect[ EFFECT_REVERB ] = new Tone.Reverb( { decay : 10, wet : 1 } ).toDestination();
  audioEffect[ EFFECT_DELAY ] = new Tone.FeedbackDelay( { delayTime : .4, feedback : 0.5 } ).toDestination();

  for( var effectIx = EFFECT_REVERB;effectIx <= EFFECT_LAST;effectIx++ )
  {
    audioEffectGain[ effectIx ] = new Tone.Gain();
    masterGain.connect( audioEffectGain[ effectIx ] );
    audioEffectGain[ effectIx ].connect( audioEffect[ effectIx ] );
  }

  samplers[ 'piano' ] = createSampler( 'piano' );
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
      element.audioFile.pause();
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

  masterGain.gain.value = 0; 
}

function createSampler( instrument )
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
      } ).connect( masterGain );

      break;
  }

  return sampler;
}

var waInitialized = false;

function synthFromName( sName )
{
  var synth = undefined;
  // find in the library
  for( var synthIx = 0;synthIx < synthLibrary.length;synthIx++ )
    if( synthLibrary[ synthIx ].elementName == sName )
    {
      synth = synthLibrary[ synthIx ];
      break;
    }

  return synth;
}

// Play a CSynth
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

  audioEffectGain[ EFFECT_REVERB ].gain.value = synth.reverbSend / 100;
  audioEffectGain[ EFFECT_DELAY ].gain.value = synth.delaySend / 100;

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
                                                        } ).connect( masterGain );
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

      masterGain.gain.value = synth.volume / 100; // 0 - 100
      activeSampler = samplers[ synth.instrument ];
      activeSampler.triggerAttack( notesToPlay );
      break;
    }
  
  return true;
}