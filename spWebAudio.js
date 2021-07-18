/* Web Audio API using Tone.js

    S0 S1 S2.. :  Audio sources. Single dry amount and a wet send for each parallel effect
    |  |  | TBD pan/level per voice
    |/___/
    |
  Mixer
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

const synthTypes = [ "sine", "square", "sawtooth", "triangle" ];

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

const NUM_SOURCES = 5;
const EFFECT_REVERB = 0;
const EFFECT_DELAY = 1;
const EFFECT_LAST = 1;

var audioSource = []; // Use a PolySynth?
var audioMixer;
var masterGain;
var audioEffectGain = []; // parallel effects levels

function initWebAudio()
{
  var audioEffect = []; // parallel effects

  masterGain = new Tone.Gain().toDestination(); // dry out.

  audioMixer = new Tone.Merge( NUM_SOURCES );
  audioMixer.connect( masterGain );

  audioEffect[ EFFECT_REVERB ] = new Tone.Reverb().toDestination();
  audioEffect[ EFFECT_DELAY ] =  new Tone.FeedbackDelay(
    { delayTime : .4, feedback : 0.5 }
     ).toDestination();

  for( var effectIx = EFFECT_REVERB;effectIx <= EFFECT_LAST;effectIx++ )
  {
    audioEffectGain[ effectIx ] = new Tone.Gain();
    //audioEffectGain[ effectIx ].gain.value = 1;
    masterGain.connect( audioEffectGain[ effectIx ] );
    audioEffectGain[ effectIx ].connect( audioEffect[ effectIx ] );
  }
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
  for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
    if( audioSource[ sourceIx ] )
    {
      audioSource[ sourceIx ].disconnect();
      audioSource[ sourceIx ] = undefined;
    }
}

var wafirstTime = true;

function synthDebug()
{
  console.log( "Debug Synth A" );

  if( wafirstTime )
  {
    initWebAudio();
    wafirstTime = false;
  }

  audioSource[ 0 ] = new Tone.Oscillator( {
                                            type : "sine",
                                            frequency : 440,
                                            volume : -16
                                          } );
  audioSource[ 0 ].connect( audioMixer );
  audioSource[ 0 ].start();
}

// Play a CSynth
function playSynth( synth ) 
{

  if( wafirstTime )
  {
    initWebAudio();
    wafirstTime = false;
  }
  stopSynth();

  masterGain.gain.value = synth.volume / 100;
  audioEffectGain[ EFFECT_REVERB ].gain.value = synth.reverbSend / 100;
  audioEffectGain[ EFFECT_DELAY ].gain.value = synth.delaySend / 100;

  var sourceIx = 0;
  for( var noteIx = 0;noteIx < 32;noteIx++ ) // noteIx 0, ocatve 0 is C4
    if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
    {
      var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440

      var freq = 440 * Math.pow( 2, noteOffset / 12 );

      audioSource[ sourceIx ] = new Tone.Oscillator( {
                                                       type : synth.instrument,
                                                       frequency : freq,
                                                     } ).connect( audioMixer );
                                                     
      audioSource[ sourceIx ].start();

      sourceIx++;
      if( sourceIx == NUM_SOURCES )
        break;
    }

  //audioEffectGain[ EFFECT_REVERB ].gain.value = synth.reverbSend / 100;
  //audioEffectGain[ EFFECT_DELAY ].gain.value = synth.delaySend / 100;

  //masterGain.gain.value = synth.volume / 100; // 0 - 100
}

/////////////// /////////////// /////////////// ///////////////
/////////////// /////////////// /////////////// ///////////////