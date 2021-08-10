/* Foot switch handling for two buttons. Assume the buttons are mapped to UP and DOWN.
 Tap L,R,LR, RL Double Tap L+R, Hold L+R
 Airturn doesn't allow using both switches at the same time so can't do

          | Start Timer       clickHoldTO
  Time -----------------------|   Trigger Hold at 'up' for determinism.
B1  ______/-------------------|---\_ Hold
    ______/----------\________| Single Tap
    ______/--\___/ <- Double Tap 
          ^--- Button pressed
B2 ___________________________|

***

B1  ______/-------------------| 
B2  ___________/ <-- Button12


In Tempo mode we bypass these features for accuracy.
*/

const SLOW_CLICK = 500;
const FAST_CLICK = 200;

const SINGLE_CLICK = 0; // no double click. Use FAST_CLICK timeout to detect HOLD
const DOUBLE_CLICK = 1; // allow double click. Use SLOW_CLICK timeout for HOLD / double clicks.

var clickMode = SINGLE_CLICK;
var clickHoldTO = SLOW_CLICK;

var footSwitchButtons = []; // array of buttons

var fsMode;

var fsButtonMap = 
{
  "EVENT_TAP" : { // Event type.
    "BUTTON1" : { // Event source
      id : 'fsB1Tap', // the DOM element to highlight
      NavUD : { html : "&uarr;", action : function() { moveCursor( 'UP' ); } },   // Nav Up down
      NavLR : { html : "&larr;", action : function() { moveCursor( 'LEFT' ); } },
      Play : { html : "&#62;", action : function() { playElement( 'START' ); } },
      Tempo : { html : "Tap", action : function() { tapTempo(); } }, // tap tempo
      Modifier : { html : "Filter", action : function() { toggleModifier( "filter" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Tap',
      NavUD : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
      NavLR : { html : "&rarr;", action : function() { moveCursor( 'RIGHT' ); } },
      Play : { html : "&#8800;", action : function() { playElement( 'STOP' ); } },
      Tempo : { html : "Set", action : function() { exitTempoMode(); changeMode( "NavUD" ); } },
      Modifier : { html : "Tremolo", action : function() { toggleModifier( "tremolo" ); } },
    },
  },

  "EVENT_HOLD" : {
    "BUTTON1" : {
      id : 'fsB1Hold',
      NavUD : { html : ">", action : function() { changeMode( "Play" ); } },
      NavLR : { html : ">", action : function() { changeMode( "Play" ); } },
      Play : { html : "Mod", action : function() { changeMode( "Modifier" ); } },
      Modifier : { html : ">", action : function() { toggleModifier( "off" ); changeMode( "Play" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Hold',
      NavUD : { html : "&larr;&rarr;", action : function() { changeMode( "NavLR" ); } },
      NavLR : { html : "&uarr;&darr;", action : function() { changeMode( "NavUD" ); } },
      Play : { html : "&larr;&rarr;", action : function() { playElement( 'STOP' ); changeMode( "NavLR" ); } },
      Modifier : { html : "Tempo", action : function() { changeMode( "Tempo" ); } },
    },
  },

  "EVENT_DTAP" : {
    "BUTTON1" : {
      id : 'fsB1DTap',
      Modifier : { html : "Chorus", action : function() { toggleModifier( "chorus" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2DTap',
      Modifier : { html : "Distortion", action : function() { toggleModifier( "distortion" ); } },
    },
  }
};

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

      // Some modes take action on down immediately.
      if( fsMode == "Tempo" )
      {
        // button presses need to be accurate and deterministic when setting tempo, so no hold or double tap functions
        // in Button12 and 21 nav modes we take action immediately. The mode is exited by a button press.
        // 1-2 puts you in 12 mode. 2 keeps moving you right until you press 1. Opposite for 21

        if( newState )
          buttonEvent( "EVENT_TAP", this.buttonID );
      }
      else
      {
        if( newState ) // true = 'down'
        {
          if( !this.pressedState ) 
          { // first click
            this.heldFlag = true;
            if( clickMode == DOUBLE_CLICK )
              this.pressedState = true;
            this.holdTimerExpired = false;
            this.holdTimer = setTimeout( holdTimerCB, clickHoldTO, this.buttonID );
          }
          else 
          { // this is the second click. Can only happen in DOUBLE_CLICK mode
            this.clearTimer();
            this.pressedState = false;
            this.heldFlag = false;
            buttonEvent( "EVENT_DTAP", this.buttonID );
          }
        }
        else // released. (up)
        {
          if( this.heldFlag && this.holdTimerExpired ) // Do HOLD on 'up' so you can control the time.
          {
            buttonEvent( "EVENT_HOLD", this.buttonID );
            this.holdTimerExpired = false;
          }
          else if( clickMode == SINGLE_CLICK )
          { // in this mode we can take action immediately on the 'up' since we don't have to 
            // check for a double tap.
            this.clearTimer();
            buttonEvent( "EVENT_TAP", this.buttonID );
            this.pressedState = false;
          }

          this.heldFlag = false;
        }
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

var lastTapTime = undefined;
const MIN_TEMPO_MS = 20; 
const MAX_TEMPO_MS = 2000;
function tapTempo()
{
  var currentTime = Date.now();

  if( lastTapTime )
  {
    var diff = currentTime - lastTapTime;
    if( ( diff > MIN_TEMPO_MS ) && ( diff < MAX_TEMPO_MS ) )
      setTempoMs( diff );
    lastTapTime = undefined;
  }
  else
    lastTapTime = currentTime;
}

function setTempoMs( newTempoMs )
{
  currentTempo = newTempoMs;

  if( curConfig.groups[ cursorGroup ].tempoMs != newTempoMs )
  {
    curConfig.groups[ cursorGroup ].tempoMs = newTempoMs;
    configEditedFlag = true;
  }

  delayBlock.set( { delayTime : currentTempo / 1000 } );
  tremoloBlock.set( { frequency : 1000 / currentTempo } ) ;

  document.getElementById( "tempoButton" ).innerHTML = Math.round( 60000 / currentTempo ) + " bpm";
}

function exitTempoMode()
{
  lastTapTime = undefined;
}

function holdTimerCB( ButtonID )
{
  footSwitchButtons[ ( ButtonID == "BUTTON1" ) ? 0 : 1 ].holdTimerCB();
}

function setClickMode( newClickMode )
{
  clickMode = newClickMode;

  if( clickMode == SINGLE_CLICK )
   clickHoldTO = FAST_CLICK; // Click and hold only. Faster response, less functionality.
  else // DOUBLE_CLICK
   clickHoldTO = SLOW_CLICK; // now eatch button can also provide double tap as a function.
}

function changeMode( newTapMode )
{
  fsMode = newTapMode;

  setClickMode( ( fsMode == "Modifier" ) ? DOUBLE_CLICK : SINGLE_CLICK );

  for( var e of [ "EVENT_TAP", "EVENT_DTAP", "EVENT_HOLD" ] )
    for( var b of [ "BUTTON1", "BUTTON2" ] )
    {
      if( fsButtonMap[ e ][ b ] )
        if( fsButtonMap[ e ][ b ][ fsMode ] )
          document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = fsButtonMap[ e ][ b ][ fsMode ].html;
        else 
          document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = '-';
    }
}

var modFilterState = false;
var modTremoloState = false;
var modChorusState = false;
var modDistState = false;

function toggleModifier( modifier )
{
  var domElem;
  var state = false;

  switch( modifier )
  {
    case "filter":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ "BUTTON1" ].id );
      modFilterState = !modFilterState;
      if( modFilterState )
        state = true;
      break;

    case "tremolo":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ "BUTTON2" ].id );
      modTremoloState = !modTremoloState;
      if( modTremoloState )
        state = true;
      break;

    case "chorus":
      domElem = document.getElementById( fsButtonMap[ "EVENT_DTAP" ][ "BUTTON1" ].id );
      modChorusState = !modChorusState;
      if( modChorusState )
        state = true;
      break;
  
    case "distortion":
      domElem = document.getElementById( fsButtonMap[ "EVENT_DTAP" ][ "BUTTON2" ].id );
      modDistState = !modDistState;
      if( modDistState )
        state = true;
      break;

    case "off":
      if( modFilterState ) toggleModifier( "filter" );
      if( modTremoloState ) toggleModifier( "tremolo" );
      if( modChorusState ) toggleModifier( "chorus" );
      if( modDistState ) toggleModifier( "distortion" );
      break;
  }
  if( domElem )
    if( state )
      domElem.classList.add( "css_cursor" ); // TBD. this is to highlight that it's on.
    else
      domElem.classList.remove( "css_cursor" );

  doModAudio( modifier, state );
}

function buttonEvent( event, buttonID )
{
  if( fsButtonMap[ event ][ buttonID ][ fsMode ] )
    fsButtonMap[ event ][ buttonID ][ fsMode ].action();

  document.getElementById( fsButtonMap[ event ][ buttonID ].id ).classList.add( 'css_highlight_red' );
  setTimeout( buttonHLTimer, 100 );
}

function buttonHLTimer() // Highlight timer.
{
  var buttons = document.getElementsByClassName( 'css_FSButton' );
  for( i = 0;i < buttons.length;i++ )
    buttons[ i ].classList.remove( 'css_highlight_red' );
}

function keyHandler( e, state )
{
  var ix;

  switch( e.code )
  {
    case 'ArrowLeft':
    case 'ArrowUp':
      ix = 0; break;
    case 'ArrowRight':
    case 'ArrowDown':
      ix = 1; break;

    default:
      return;
  } 

  footSwitchButtons[ ix ].setState( state );
}

function keyPressedHandler( e ) { keyHandler( e, true ); } // down / pressed
function keyRelHandler( e ) { keyHandler( e, false ); } // up / released

function moveCursor( dir )
{
  switch( dir )
  {
    case 'TOP':
      cursorGroup = 0;
      break;
  
    case 'UP':
      if( cursorGroup > 0 )
      {
        cursorGroup -= 1;
        if( curConfig.groups[ cursorGroup ].seqMode != seqModes[ 0 ] )
          cursorElement = 0; // amost certain want to start from the beginning

        setTempoMs( curConfig.groups[ cursorGroup ].tempoMs );
      }
      break;

    case 'DOWN':
      if( cursorGroup < curConfig.groups.length - 2 )
      {
        cursorGroup += 1;
        if( curConfig.groups[ cursorGroup ].seqMode != seqModes[ 0 ] )
          cursorElement = 0;

        setTempoMs( curConfig.groups[ cursorGroup ].tempoMs );
      }
      break;

    case 'START':
      cursorElement = 0;
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
  genElementConfigHTML();
}