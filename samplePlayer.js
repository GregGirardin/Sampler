var serverURL = 'http://192.168.0.2:8080/'; // this is where samples.json and all the samples live.
// var serverURL = 'https://greggirardin.github.io/samples/';
var configFile = 'sampleConfig.json';
var synthConfigFile = 'synthConfig.json';

// Can specify in URL. https://setlist.loc.com/?serverURL='https://your.samples.loc/path/to/stuff'
var configEditedFlag = false;
var synthEditedFlag = false;
var sampleLibrary = {}; // object of ClLibrarySample
var synthLibrary = []; // object of CSynth
var curConfig;

var editElement; // What we're editing if "Mode_Edit"

var didNavFlag = false;

// Constants.
const MAX_GROUPS = 10;

var operationMode = "Mode_Default";
var fsMode = "PM"; 
var cursorGroup = 0, cursorElement = 0; // cursor

var loopTypes = [ "Once", "Repeat" ];
var seqTypes = [ "None",
                 "Next",  // move to the next sample in the group
                 "Cont" ]; // keep playing from one sample to the next.

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

class CSample
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
    this.volume = 100;
    this.duration = "?";
  }
}

class CGroup
{
  constructor( groupName )
  {
    this.objType = "CGroup";

    this.elementName = groupName;
    this.seqType = "None"; // None, Single, Loop
    this.elements = []; // CSample, CChord, etc.
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

var audioContext;

//////////////////////////// ////////////////////////////
//////////////////////////// ////////////////////////////
window.onload = sampleListInit;

function changeURL()
{
  serverURL = document.getElementById( 'serverURL' ).value;
}

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
  //getFileFromServer( "synthLib.json", gotSynthLib );

  document.getElementById( 'serverURL' ).value = serverURL;
  document.getElementById( 'serverURL' ).addEventListener( 'change', changeURL, false );

  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup', keyRelHandler );

  footSwitchButtons[ 0 ] = new FootSwitchButton( "BUTTON1" );
  footSwitchButtons[ 1 ] = new FootSwitchButton( "BUTTON2" );

  genSynthLibraryHTML();
}

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

function stopAllAudio() // go through all groups
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
    {
      masterGain.gain.value = 0.0;

      for( var sourceIx = 0;sourceIx < NUM_SOURCES;sourceIx++ )
        if( audioSource[ sourceIx ] )
          audioSource[ sourceIx ].source.disconnect();
    }
  }
}

function playEndedCB( ev )
{
  stopAudio( this.sampleObj );
  if( this.sampleObj.playNext && !didNavFlag )
    playElement( "START" );
}

function playElement( status )
{
  if( ( cursorGroup != undefined ) && ( cursorElement != undefined ) )
  {
    var ce = curConfig.groups[ cursorGroup ].elements[ cursorElement ];
    var seqType = curConfig.groups[ cursorGroup ].seqType;

    stopAllAudio();

    if( status == "START" )
    {
      ce.id = "slElement." + cursorGroup + "." + cursorElement;
      ce.playNext = ( seqType == seqTypes[ 2 ] ) ? true : false;

      document.getElementById( ce.id ).classList.add( 'css_playing' );
      ce.playing = true;
      if( ce.objType == "CSample" )
      {
        var af = ce.audioFile;
        if( af )
        {
          af.currentTime = 0; // Start from the beginning
          af.loop = ( ce.loopType == "Once" ) ? false : true;
          if( ce.loopType == "Once" )
            af.onended = playEndedCB;

          af.sampleObj = ce;
          af.play();
        }
        else
        {
          console.log( "Audio not loaded:", ce.elementName );
          ce.playing = false;
        }
      }
      else if( ce.objType == "CSynth" )
      {
        // find the library synth
        for( var synthIx = 0;synthIx < synthLibrary.length;synthIx++ )
          if( synthLibrary[ synthIx ].elementName == ce.elementName )
          {
            playSynth( synthLibrary[ synthIx ] );
            break;
          }
      }
      if( seqType != seqTypes[ 0 ] )
      {
        moveCursor( "RIGHT" );
        didNavFlag = false;
      }
    }
    else
    {
      // tbd. We may want to play multiple sources at the same time.
      // if( seqType == seqTypes[ 0 ] )
      //   stopAudio( ce );
      // else
      ce.playing = false;
    }
  }
}

/* Foot switch handling for two buttons. Assume the buttons are mapped to UP and DOWN.
   8 functions: Tap L+R, Double Tap L+R, Hold L+R, Both Tap, Both hold

          | Start Timer       clickHoldTO
  Time -----------------------|   Trigger Hold at 'up' for determinism.
    ______/-------------------|---\_ Hold
    ______/----------\________| Single Tap
    ______/--\___/-| Double Tap 
          ^--- Button pressed
*/
const clickHoldTO = 250;

var footSwitchButtons = []; // array of buttons
var bothHeldTimer;

var fsMode = "PM"; // Play Mode

var fsButtonMap = 
{
  "EVENT_TAP" : {
    "BUTTON1" : {
      id : 'fsB1Tap', // the DOM element to flash
      PM : { html : "&larr;", action : function() { moveCursor( 'LEFT' ); } },
      DM : { html :       "", action : function() { } }
    },
    "BUTTON2" : {
      id : 'fsB2Tap',
      PM : { html : "&rarr;", action : function() { moveCursor( 'RIGHT' ); } },
      DM : { html :       "", action : function() { } }
    },
    "BUTTONB" : { 
      id : 'fsBBTap',
      PM : { html : "NA", action : function() { } },
      DM : { html : "NA", action : function() { } } 
    },
  },

  "EVENT_DTAP" : {
    "BUTTON1" : {
      id : 'fsB1DTap',
      PM : { html : "&#62;", action : function() { playElement( 'START' ); } },
      DM : { html : "&#62;", action : function() { playElement( 'START' ); } }
    },
    "BUTTON2" : {
      id : 'fsB2DTap',
      PM : { html : "#8800;", action : function() { playElement( 'STOP' ) } },
      DM : { html : "#8800;", action : function() { playElement( 'STOP' ) } }
    },
  },

  "EVENT_HOLD" : {
    "BUTTON1" : {
      id : 'fsB1Hold',
      PM :  { html : "&uarr;", action : function() { moveCursor( 'UP' ); } }, 
      DM :  { html : "#8800;", action : function() { moveCursor( 'UP' ); } }
    },
    "BUTTON2" : {
      id : 'fsB2Hold',
      PM : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
      DM : { html : "#8800;", action : function() { moveCursor( 'DOWN' ); } }
    },
    "BUTTONB" : {
      id : 'fsBBHold',
      PM : { html :   "Play", action : function() { togglePlayMode(); } },
      DM : { html : "Direct", action : function() { togglePlayMode(); } }
    },
  }
};

function togglePlayMode()
{
  var elem = document.getElementById( 'fsBBHold' );

  if( fsMode == "PM" )
  {
    fsMode = "DM"; // direct mode
    elem.innerHTML = "Direct";
  }
  else
  {
    fsMode = "PM"; // play mode
    elem.innerHTML = "Play";
  }
}

function moveCursor( dir )
{
  switch( dir )
  {
    case 'UP':
      if( cursorGroup > 0 )
        cursorGroup -= 1;
      break;

    case 'DOWN':
      if( cursorGroup < curConfig.groups.length - 2 )
        cursorGroup += 1;
      break;

    case 'LEFT':
      if( cursorElement > 0 )
        cursorElement -= 1;
      break;

    case 'RIGHT':
      cursorElement += 1;
      if( cursorElement > curConfig.groups[ cursorGroup ].elements.length - 1 )
        cursorElement = 0;
      break;
  }
  didNavFlag = true; // navigating stops the continuous playing of a sequence.
  genElementConfigHTML();
}

function buttonEvent( event, buttonID )
{
  fsButtonMap[ event ][ buttonID ][ fsMode ].action();
  var elem = document.getElementById( fsButtonMap[ event ][ buttonID ].id );
  elem.classList.add( 'css_highlight_red' );
  setTimeout( buttonHLTimer, 100 );
}

function buttonHLTimer()
{
  var buttons = document.getElementsByClassName( 'css_FSButton' );
  for( i = 0;i < buttons.length;i++ )
    buttons[ i ].classList.remove( 'css_highlight_red' );
}

function bothHoldTimerCB() // Both buttons were held.
{
  bothHeldTimer = undefined; // clear. It's used as a flag below.
  buttonEvent( "EVENT_HOLD", "BUTTONB" );
  footSwitchButtons[ 0 ].pressedState = false;
  footSwitchButtons[ 1 ].pressedState = false;
}

class FootSwitchButton
{
  constructor( identifier )
  {
    this.buttonID = identifier;
    this.buttonState = false;
    this.heldFlag = false;
    this.pressedState = false;
    this.holdTimer = undefined;
    this.holdTimerExpired = false;
  }

  clearTimer()
  {
    clearTimeout( this.holdTimer );
    this.holdTimer = undefined;
  }

  setState( newState )
  {
    if( newState != this.buttonState )
    {
      this.buttonState = newState;

      if( newState ) // true = 'down'
      {
        // Check for both buttons pressed
        var otherButtonIx = ( this.buttonID == "BUTTON1" ) ? 1 : 0;
        if( footSwitchButtons[ otherButtonIx ].buttonState ) // both pressed ?
        {
          this.clearTimer(); // clear existing timers and set the 'both' timer.
          footSwitchButtons[ otherButtonIx ].clearTimer();
          bothHeldTimer = setTimeout( bothHoldTimerCB, clickHoldTO );
        }
        else
        {
          if( !this.pressedState ) 
          { // first click
            this.heldFlag = true;
            this.pressedState = true; 
            this.holdTimer = setTimeout( holdTimerCB, clickHoldTO, this.buttonID );
          }
          else 
          { // this is the second click.
            this.clearTimer();
            this.pressedState = false;
            buttonEvent( "EVENT_DTAP", this.buttonID );
          }
        }
      }
      else // up
      {
        if( this.holdTimerExpired )
        {
          buttonEvent( "EVENT_HOLD", this.buttonID );
          this.holdTimerExpired = false;
        }
        else if( bothHeldTimer ) // both aren't pressed but they were previously
        {
          var otherButtonIx = ( this.buttonID == "BUTTON1" ) ? 1 : 0;
          clearTimeout( bothHeldTimer );
          bothHeldTimer = undefined;
          this.clearTimer();
          this.pressedState = false; 

          footSwitchButtons[ otherButtonIx ].clearTimer();
          footSwitchButtons[ otherButtonIx ].pressedState = false;
          buttonEvent( "EVENT_TAP", "BUTTONB" );
        }
        this.heldFlag = false;
      }
    }
  }

  holdTimerCB()
  {
    this.pressedState = false;
    this.holdTimer = undefined;

    if( !this.heldFlag )
      buttonEvent( "EVENT_TAP", this.buttonID );
    else
    {
      // highlight hold when the timer expires so user knows release will trigger the event.
      var elem = document.getElementById( fsButtonMap[ "EVENT_HOLD" ][ this.buttonID ].id );
      elem.classList.add( 'css_highlight_red' );
      this.holdTimerExpired = true;
    }
  }
}

// TBD. Call class method directly?
function holdTimerCB( ButtonID )
{
  footSwitchButtons[ ( ButtonID == "BUTTON1" ) ? 0 : 1 ].holdTimerCB();
}

function keyHandler( e, state )
{
  var ix;

  switch( e.code )
  {
    case 'ArrowLeft':
    case 'ArrowUp':   ix = 0; break;
    case 'ArrowRight':
    case 'ArrowDown': ix = 1; break;
    default: return;
  }
  footSwitchButtons[ ix ].setState( state );
}

function keyPressedHandler( e ) { keyHandler( e, true ); } // down / pressed
function keyRelHandler( e ) { keyHandler( e, false ); } // up / released

///////////////////////// ///////////////////////// /////////////////////////
///////////////////////// ///////////////////////// /////////////////////////
function gotSamples( file, data )
{
  sampleLibrary = JSON.parse( data );
  generateLibraryHTML();
}

function gotConfig( file, data )
{
  if( data )
  {
    curConfig = JSON.parse( data );
    genElementConfigHTML();
    getSampleAudio();
  }
}

function gotSynthLib( file, data )
{
  if( data )
  {
    synthLibrary = JSON.parse( data );
    genSynthLibraryHTML();
  }
}

function getSampleAudio()
{
  for( var g = 0;g < curConfig.groups.length;g++ )
    for( var s = 0;s < curConfig.groups[ g ].elements.length;s++ )
    {
      var cs = curConfig.groups[ g ].elements[ s ];
      if( cs.objType == "CSample" )
        if( cs.audioFile == undefined )
          cs.audioFile = new Audio( serverURL + cs.filename );
    }
}

function getFileFromServer( filename, callback )
{
  var xhr = new XMLHttpRequest();

  xhr.overrideMimeType( "application/json" );
  xhr.open( "GET", serverURL + filename, true );
  xhr.onreadystatechange = function() {
    if ( xhr.readyState === 4 )
      if( xhr.status == "200" )
        callback( filename, xhr.responseText );
      else
        callback( filename, false ); // Error, file not present probably.
  }
  xhr.onerror = function( e ) {
    callback( filename, false );
  }
  xhr.ontimeout = function( e ) {
    callback( filename, false );
  }

  xhr.send( null );
}

function sl_allowDrop( ev ) { ev.preventDefault(); }
function dragElem( ev ) { ev.dataTransfer.setData( "dragElem", ev.target.id ); }

/////////////// /////////////// /////////////// ///////////////
// Handle a song being dropped onto a setlist file.
// Samples can be dragged from within the setlist to move them or from the Library to add them.
/////////////// /////////////// /////////////// ///////////////
function dropElem( ev )
{
  const slElem = "slElement.";
  const slGroup = "slGroup.";
  const cbStr = "clipboard";
  const libSamp = "libSample.";
  const libSynthID = "libSynth.";

  ev.preventDefault();
  var dragElem = ev.dataTransfer.getData( "dragElem" );

  if( ( dragElem.substring( 0, cbStr.length ) == cbStr ) &&
      ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // dropping the clipboard onto a set.
  {
    indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toSampleIx = parseInt( indexes[ 1 ] );

    if( toGroup < curConfig.groups.length - 1 )
      while( true )
      {
        var song = curConfig.groups[ curConfig.groups.length - 1 ].elements.pop();
        if( song )
          curConfig.groups[ toGroup ].elements.splice( toSampleIx, 0, song );
        else
          break;
      }
  }
  else if( ( dragElem.substring( 0, slElem.length ) == slElem ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Moving an element
  {
    var indexes = dragElem.substring( slElem.length, ).split( "." );
    var fromGroup = parseInt( indexes[ 0 ] );
    var fromElementIx = parseInt( indexes[ 1 ] );

    indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    if( fromGroup == toGroup ) // Moving within the same set
    {
      if( toElementIx < fromElementIx ) // Moved song up
      {
        curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
        curConfig.groups[ fromGroup ].elements.splice( fromElementIx + 1, 1 );
      }
      else
      {
        curConfig.groups[ toGroup ].elements.splice( toElementIx + 1, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
        curConfig.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
      }
    }
    else // Move between groups.
    {
      curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, curConfig.groups[ fromGroup ].elements[ fromElementIx ] );
      curConfig.groups[ fromGroup ].elements.splice( fromElementIx, 1 );
    }
  }
  else if( ( dragElem.substring( 0, libSamp.length ) == libSamp ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping library song into set list.
  {
    var sampId = dragElem.substring( libSamp.length, );
    var libSample = sampleLibrary[ sampId ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, new CSample( libSample.filename ) );
  }
  else if( ( dragElem.substring( 0, slGroup.length ) == slGroup ) &&
           ( ev.target.id.substring( 0, slGroup.length ) == slGroup ) ) // Moving a group
  {
    var fromGroup = parseInt( dragElem.substring( slGroup.length, ) );
    var toGroup = parseInt( ev.target.id.substring( slGroup.length, ) );

    if( toGroup < fromGroup ) // moved group up
    {
      curConfig.groups.splice( toGroup, 0, curConfig.groups[ fromGroup ] );
      curConfig.groups.splice( fromGroup + 1, 1 );
    }
    else
    {
      curConfig.groups.splice( toGroup + 1, 0, curConfig.groups[ fromGroup ] );
      curConfig.groups.splice( fromGroup, 1 );
    }
  }
  else if( ( dragElem.substring( 0, libSynthID.length ) == libSynthID ) &&
           ( ev.target.id.substring( 0, slElem.length ) == slElem ) ) // Dropping Synth into config 
  {
    var sampIx = dragElem.substring( libSynthID.length, );
    var libSynth = synthLibrary[ sampIx ];
    var indexes = ev.target.id.substring( slElem.length, ).split( "." );
    var toGroup = parseInt( indexes[ 0 ] );
    var toElementIx = parseInt( indexes[ 1 ] );

    curConfig.groups[ toGroup ].elements.splice( toElementIx, 0, new CSynth( libSynth.elementName ) );
  }
  else if( ev.target.id == "trashCan" )
  {
    if( dragElem.substring( 0, slElem.length ) == slElem )
    {
      var indexes = dragElem.substring( slElem.length, ).split( "." );
      var delGroup = parseInt( indexes[ 0 ] );
      var delSample = parseInt( indexes[ 1 ] );

      curConfig.groups[ delGroup ].elements.splice( delSample, 1 );
    }
    else if( dragElem.substring( 0, slGroup.length ) == slGroup )
    {
      var delGroup = parseInt( dragElem.substring( slGroup.length, ) );
      curConfig.groups.splice( delGroup, 1 );
    }
    else if( dragElem.substring( 0, cbStr.length ) == cbStr )
      curConfig.groups[ curConfig.groups.length - 1 ].elements = [];
  }

  configEditedFlag = true;

  getSampleAudio();// get any new audio.
  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function setSampleConfigName()
{
  var name = prompt( "Enter Config Name:", curConfig.name );
  if( name )
  {
    curConfig.name = name;
    configEditedFlag = true;
    document.getElementById( 'sampleListName' ).innerHTML = name;
  }
}

/////////////// /////////////// /////////////// ///////////////
function groupClick( groupIndex )
{
  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    editElement = curConfig.groups[ groupIndex ];

    var tmpHtml = "<hr>";
    tmpHtml += "Name: <input contenteditable='true' id='editGroupName' value='" + editElement.elementName + "'><br>";
    tmpHtml += "Sequence:<select id='editGroupSequence'>";

    for( var i = 0;i < seqTypes.length;i++ )
    {
      tmpHtml += "<option value='" + seqTypes[ i ] + "' ";
      if( editElement.seqType == seqTypes[ i ] )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + seqTypes[ i ] + "</option>";
    }
    tmpHtml += "</select><br>";

    document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
  }
}

/////////////// /////////////// ///////////////
function elemClick( groupIndex, sampleIndex )
{
  if( ( cursorGroup != groupIndex ) && ( cursorElement != sampleIndex ) )
    didNavFlag = true;

  cursorGroup = groupIndex;
  cursorElement = sampleIndex;

  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    var i;
    var tmpHtml = "<hr>";

    editElement = curConfig.groups[ groupIndex ].elements[ sampleIndex ];

    if( editElement.objType == "CSample" )
    {
      tmpHtml += "Display Name: <input contenteditable='true' id='editSampleName' value='" + editElement.elementName + "'><br>";
      tmpHtml += "File: " + editElement.filename + "<br>";
      tmpHtml += "Volume: <input type='range' id='editSampleVolume' min='0' max='100' value='" + editElement.volume + "'><br>";
      tmpHtml += "Fade In: <input type='range' id='editSampleFIT' min='0' max='5000' value='" + editElement.fadeInTime + "'><br>";
      tmpHtml += "Fade Out: <input type='range' id='editSampleFOT' min='0' max='5000' value='" + editElement.fadeOutTime + "'><br>";
      var duration = "?";
      if( editElement.audioFile )
        duration = ( editElement.audioFile.duration * 1000 ).toString().split( '.' )[ 0 ] + "ms";
      tmpHtml += "Audio Length: " + duration + "<br>";
      tmpHtml += "Play:<select id='editSamplePT'>";

      for( i = 0;i < loopTypes.length;i++ )
      {
        tmpHtml += "<option value='" + loopTypes[ i ] + "' ";
        if( editElement.loopType == loopTypes[ i ] )
          tmpHtml += "selected='selected'";
        tmpHtml += ">" + loopTypes[ i ] + "</option>";
      }
      tmpHtml += "</select><br>";

      document.getElementById( 'multiuse' ).innerHTML = tmpHtml;
    }
    else if( editElement.objType == "CSynth" )
    {
      document.getElementById( 'multiuse' ).innerHTML = "TBD: Edit in Synth Library";
      editElement = undefined;
    }
    else
      editElement = undefined;
  }
  genElementConfigHTML(); // need to indicate the cursor location
}

/////////////// /////////////// ///////////////

function synthClick( synthIndex )
{
  if( operationMode == "Mode_Edit" )
  {
    saveEdits();
    editElement = synthLibrary[ synthIndex ];
  
    var tmpHtml = "<hr>Name: <input contenteditable='true' id='editSynthName' value='" + editElement.elementName + "'><br>";

    tmpHtml += "Octave:<select id='editSynthOctave'>";
    for( i = -3;i <= 3;i++ )
    {
      tmpHtml += "<option value='" + i + "' ";
      if( editElement.octave == i )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + i + "</option>";
    }
    tmpHtml += "</select><br>";

    tmpHtml += "Instrument:<select id='editSynthInstrument'>";
    for( i = 0;i < synthTypes.length;i++ )
    {
      tmpHtml += "<option value='" + synthTypes[ i ] + "' ";
      if( editElement.instrument == synthTypes[ i ] )
        tmpHtml += "selected='selected'";
      tmpHtml += ">" + synthTypes[ i ] + "</option>";
    }
    tmpHtml += "</select><br>";

    tmpHtml += "<div class='css_keyboard' id='keyboard_id'><br>";
    document.getElementById( 'multiuse' ).innerHTML = tmpHtml;

    drawKeyboard();
  }
  else
  {
    // tbd, add this synth to clipboard
  }
}

function drawKeyboard()
{
  const noteNames = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
  const blackKeys = [         1,         3,              6,         8,        10 ];
  // Two octave keyboard
  var tmpHtml = "<div class='css_keyboard' id='keyboard'><br>";

  for( var note = 0;note < 24;note++ )
  {
    var css_class = ( blackKeys.includes( note % 12 ) ) ? 'css_blackKey' : 'css_whiteKey';

    if( ( 1 << note ) & editElement.notes )
      css_class += ' css_pressedKey';

    tmpHtml += "<button class='" + css_class + "' onclick='keyPressed( " + note + " );'>" + noteNames[ note % 12 ] + "</button>";
  }
  tmpHtml += "<br><br></div>";
  tmpHtml += "Duration: <input type='range' id='editSynthDuration' min='0' max='1000' value='" + editElement.duration + "'><br>";
  tmpHtml += "Reverb: <input type='range' id='editSynthReverb' min='0' max='100' value='" + editElement.reverbSend + "'><br>";
  tmpHtml += "Delay: <input type='range' id='editSynthDelay' min='0' max='100' value='" + editElement.delaySend + "'><br>";

  document.getElementById( 'keyboard_id' ).innerHTML = tmpHtml;
}

function keyPressed( note )
{
  var pressed = ( ( 1 << note ) & editElement.notes );

  if( pressed )
    editElement.notes &= ~( 1 << note ); // clear
  else
    editElement.notes |= ( 1 << note );

  drawKeyboard();
}

/////////////// /////////////// /////////////// ///////////////
function libSampleClick( songId )
{
  // add to Clipboard
  sample = new CSample( sampleLibrary[ songId ].filename );
  curConfig.groups[ curConfig.groups.length - 1 ].elements.push( sample ); 
  genElementConfigHTML();
}

/////////////// /////////////// /////////////// ///////////////
function groupAdd()
{
  if( curConfig.groups.length < MAX_GROUPS )
  {
    curConfig.groups.splice( curConfig.groups.length - 1, 0, new CGroup( "Group" ) );
    configEditedFlag = true;
    genElementConfigHTML();
  }
  else
    alert( "Max Groups reached" );
}

/////////////// /////////////// /////////////// ///////////////
function genElementConfigHTML()
{
  var l = curConfig.groups.length;
  if( l == 1 )
    cursorGroup = undefined;
  else
  {
    if( cursorGroup == undefined )
      cursorGroup = 0;
    if( cursorGroup >= l - 1 )
      cursorGroup = l - 2;
    l = curConfig.groups[ cursorGroup ].elements.length;
    if( cursorElement >= l )
      cursorElement = l - 1;
    else if( ( cursorElement < 0 ) && ( l > 0 ) )
      cursorElement = 0;
  }

  var tempHtml = "<div id='sampleListName' onClick='setSampleConfigName()'>" + curConfig.name + "</div><br>";

  for( var i = 0;i < curConfig.groups.length;i++ )
  {
    var g = curConfig.groups[ i ];
    var classes = 'css_groupClass';

    switch( g.seqType )
    {
      case "Single": break;
      case "Next": classes += ' css_groupSeqNext'; break;
      case "Cont": classes += ' css_groupSeqCont'; break;
    }

    if( i == curConfig.groups.length - 1 )
      tempHtml += "<button id='clipboard' class='css_Clipboard' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'> Clipboard </button>\n";
    else
      tempHtml += "<button id='slGroup." + i + "' class='" + classes + "' onclick='groupClick( " + i + " )' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>" + g.elementName + "</button>\n";

    for( var j = 0;j < g.elements.length;j++ )
    {
      var classes = 'css_slElement';

      if( g.elements[ j ].playing )
        classes += ' css_playing';

      tempHtml += "<button id='slElement." + i + "." + j + "' class='" + classes + "' onclick='elemClick( " + i + ", " + j + " )'" +
                  " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                  g.elements[ j ].elementName + "</button>\n";
    }
    tempHtml += "<button id='slElement." + i + "." + j + "' class='css_slElement' onclick='elemClick( " + i + ", " + j + " )'" +
                "  ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>&nbsp+&nbsp</button>\n";

    if( g.elements.length )
      tempHtml += "<font size='1'>" + g.elements.length + "</font>";
    tempHtml += "<br>\n";
  }

  tempHtml += "<br><button onclick='groupAdd()'> Add Group </button>\n<br>\n<br>";
  tempHtml += "<input id='trashCan' type='image' ondragover='sl_allowDrop( event )' ondrop='dropElem( event )' src='https://greggirardin.github.io/trashcan.png'/>\n";

  document.getElementById( 'audioElements' ).innerHTML = tempHtml;

  if( configEditedFlag || synthEditedFlag )
    document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );
  else
    document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  var elem;
  if( cursorGroup >= 0 && cursorElement >= 0 )
    elem = document.getElementById( 'slElement.' + cursorGroup + '.' + cursorElement );
  else if( cursorGroup )
    elem = document.getElementById( 'slGroup.' + cursorGroup );
  if( elem )
    elem.classList.add( 'css_cursor' );

  // if( !audioFiles[ curConfig.groups[ i ].elements[ j ].filename ] )
  //   classes += ' css_pending';
}

function genSynthLibraryHTML()
{
  var tempHtml = "<hr>";

  for( var i = 0;i < synthLibrary.length;i++ )
    tempHtml += "<button id='libSynth." + i + "' class='css_synth' onclick='synthClick( " + i + " )'" +
                " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                synthLibrary[ i ].elementName + "</button>\n";

  tempHtml += "<button onclick='synthAdd()' class='css_synth'> + </button>\n<br>\n<br>";

  document.getElementById( 'synthDiv' ).innerHTML = tempHtml;
}

function saveEdits()
{
  if( editElement )
    switch( editElement.objType )
    {
      case "CSample":
        editElement.elementName = document.getElementById( "editSampleName" ).value; 
        editElement.volume = document.getElementById( "editSampleVolume" ).value; 
        editElement.fadeInTime = document.getElementById( "editSampleFIT" ).value; 
        editElement.fadeOutTime = document.getElementById( "editSampleFOT" ).value; 
        editElement.loopType = document.getElementById( "editSamplePT" ).value;
        break;
    
      case "CGroup":
        editElement.elementName = document.getElementById( "editGroupName" ).value;
        editElement.seqType = document.getElementById( "editGroupSequence" ).value;
        break;

      case "CLibSynth":
        editElement.elementName = document.getElementById( "editSynthName" ).value;
        editElement.instrument = document.getElementById( "editSynthInstrument" ).value;
        editElement.octave = document.getElementById( "editSynthOctave" ).value;
        editElement.duration = document.getElementById( "editSynthDuration" ).value;
        editElement.delaySend = document.getElementById( "editSynthDelay" ).value;
        editElement.reverbSend = document.getElementById( "editSynthReverb" ).value;
        break;
    }

  editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
  genSynthLibraryHTML();

  configEditedFlag = true;
}

///////////////////////// ///////////////////////// /////////////////////////
function changeMode( mode )
{
  // We were editing a library file. Save the changes.
  if( operationMode == "Mode_Edit" )
    saveEdits();
  operationMode = ( mode == operationMode ) ? "Mode_Default" : mode;

  var buttons = document.getElementsByClassName( 'css_modeButton' );
  for( var i = 0;i < buttons.length;i++ )
    buttons[ i ].classList.remove( 'css_highlight_red' );
  buttons = document.getElementsByClassName( 'css_menuButton' );
  for( i = 0;i < buttons.length;i++ )
    buttons[ i ].classList.remove( 'css_highlight_red' );

  if( operationMode == "Mode_Edit" )
    document.getElementById( 'modeEditButton' ).classList.add( 'css_highlight_red' );
}

/////////////// /////////////// /////////////// ///////////////
// generate the library pane.
// 1) list of samples from the library that can be dragged into the set list 
// 2) A library song we're editing.
/////////////// /////////////// /////////////// ///////////////
function generateLibraryHTML()
{
  var tmpHtml = "";
  var t = []; // Array for sorting.

  for( const[ key, value ] of Object.entries( sampleLibrary ) )
    t.push( value );
  t.sort( function( a, b ){ return ( a.filename > b.filename ) ? 1 : -1 } );

  if( !t.length )
    tmpHtml += "<h2>No Sample Library.</h2>";
  else
    for( var i = 0;i < t.length;i++ )
      tmpHtml += "<button id='libSample." + t[ i ].filename +
                 "' class='css_librarySample' draggable='true' ondragstart='dragElem( event )'" + 
                  "onclick='libSampleClick( \"" + t[ i ].filename + "\")'>" + t[ i ].filename + "</button>\n";

  document.getElementById( 'libraryDiv' ).innerHTML = tmpHtml;
}

/////////////// /////////////// /////////////// ///////////////
// This are just a couple big string literals for the generated output setlist html.
// Put here to make the export function more readable
/////////////// /////////////// /////////////// ///////////////
function htmlConstStrings( index )
{
  switch( index )
  {
    case 0:
      return( function(){/* 
<h2> Sample Player Creator </h2>
Create a new Sample List with 'New'. Add Groups with 'Add Group'. Click on names to rename.<br>
<br>
Drag samples from the Library in the right pane to the desired location. Samples and groups can be rearranged
by dragging. Delete things by dragging to the Trash.<br>
<br>
A library can be specified by appending "?library=http://x.y.z/???.json" to this URL.
    
*/}.toString().slice( 14, -3 ) + "</" + "script> </" + "body> </html>" ); // little hack because certain tags confuse the browser.
    break;
  }

  return undefined;
}

/////////////// /////////////// /////////////// /////////////// ///////////////
// Save the current config
/////////////// /////////////// /////////////// /////////////// ///////////////
function sampleConfigSave()
{
  saveEdits();

  if( configEditedFlag )
  {
    // Hack. In order not to save the Audio in the json we delete it and reload after saving.
    for( var g = 0;g < curConfig.groups.length;g++ )
      for( var s = 0;s < curConfig.groups[ g ].elements.length;s++ )
        curConfig.groups[ g ].elements[ s ].audioFile = undefined;

    var configData = JSON.stringify( curConfig, null, "  " );

    getSampleAudio();

    var formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + configFile );
    xhr.send( formData );

    configEditedFlag = false;
  }

  if( synthEditedFlag ) // Save the Synth Library.
  {
    configData = JSON.stringify( synthLibrary, null, "  " );
    formData = new FormData();
    formData.append( "data", configData );

    var xhr = new XMLHttpRequest();
    xhr.open( 'post', serverURL + synthConfigFile );
    xhr.send( formData );
    synthEditedFlag = false;
  }

  document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  return true;
}

/////////////// /////////////// ///////////////
/////////////// /////////////// ///////////////
var helpState = false;
function toggleHelp()
{
  helpState = !helpState;
  var helpHtml = "";

  if( helpState )
    helpHtml = htmlConstStrings( 0 );

  var helpElem = document.getElementById( 'multiuse' );
  helpElem.innerHTML = helpHtml;
}

function synthAdd()
{
  synthLibrary.push( new CLibSynth( "New" ) );
  genSynthLibraryHTML();
}