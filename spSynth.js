

/* Web Audio API

    S0 S1 S2.. :  Audio sources. Single dry amount and a wet send for each parallel effect
    |  |  | TBD pan/level per voice
    |/___/
    |
  Mixer
    |
  Master Gain
    |\
    | \
    |  \_________
    |   |        |
    |  RGain    DGain  FX gains
    |   |        |
    |  Reverb   Delay  Parallel FX
    |   |        |
    |   /       /
   Out  <------   

  */

var synthTypes = [ "sine", "square", "sawtooth", "triangle" ];

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
    this.instrument = synthTypes[ 0 ]; // synthesized
    this.octave = 0;
    this.duration = 0; // ms.
    this.reverbSend = 0; // 0-100
    this.delaySend = 0;
  }
}

const NUM_SOURCES = 4;
const EFFECT_REVERB = 0;
const EFFECT_DELAY = 1;
const EFFECT_LAST = 1;

var audioContext;
var audioSource = [];
var audioMixer;
var masterGain;
var audioEffect = []; // parallel effects
var audioEffectGain = []; // parallel effects

function initWebAudio()
{
  audioContext = new AudioContext();
  masterGain = audioContext.createGain();

  audioMixer = audioContext.createChannelMerger( NUM_SOURCES );
  audioMixer.connect( masterGain );
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect( audioContext.destination ); // Dry out

  audioEffect[ EFFECT_REVERB ] = audioContext.createConvolver();
  audioEffect[ EFFECT_DELAY ] = audioContext.createDelay();

  for( var effectIx = EFFECT_REVERB;effectIx < EFFECT_LAST;effectIx++ )
  {
    audioEffectGain[ effectIx ] = audioContext.createGain();
    audioEffectGain[ effectIx ].gain.value = 1;
    masterGain.connect( audioEffectGain[ effectIx ] );
    audioEffectGain[ effectIx ].connect( audioEffect[ effectIx ] );
    audioEffect[ effectIx ].connect( audioContext.destination );
  }
}

var wafirstTime = true;

function playSynth( synth ) // a CSynth
{
  if( wafirstTime )
  {
    initWebAudio();
    wafirstTime = false;
  }

  masterGain.gain.value = 0.0;
  for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
    if( audioSource[ sourceIx ] )
      audioSource[ sourceIx ].source.disconnect();

  var sourceIx = 0;
  for( var noteIx = 0;noteIx < 24;noteIx++ )
    if( synth.notes & ( 1 << noteIx ) ) // notes are a bit field
    {
      var noteOffset = noteIx - 9 + synth.octave * 12; // semitone offset from A440
      
      audioSource[ sourceIx ] = {};
      audioSource[ sourceIx ].source = audioContext.createOscillator();
      audioSource[ sourceIx ].source.connect( masterGain );
      audioSource[ sourceIx ].source.start();

      audioSource[ sourceIx ].source.type = synth.instrument;
      var freq = 440 * Math.pow( 2, noteOffset / 12 );
      audioSource[ sourceIx ].source.frequency.setValueAtTime( freq, audioContext.currentTime );

      sourceIx++;
      if( sourceIx == NUM_SOURCES )
        break;
    }
  masterGain.gain.value = 1.0;
}