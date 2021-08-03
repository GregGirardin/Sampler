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
const clickHoldTO = 500;

var footSwitchButtons = []; // array of buttons

var tapMode = "Nav";

var fsButtonMap = 
{
  "EVENT_TAP" : { // Event type.
    "BUTTON1" : { // Event source
      id : 'fsB1Tap', // the DOM element to highlight
      Nav : { html : "&uarr;", action : function() { moveCursor( 'UP' ); } },   // Nav Up down
      Tempo : { html : "Tap", action : function() { tapTempo(); } }, // tap tempo
      Modifier : { html : "Filter", action : function() { setModMode( "filter" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Tap',
      Nav : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
      Tempo : { html :    "Set", action : function() { exitTempoMode(); changeMode( "Nav" ); } },
      Modifier : { html : "Tremolo", action : function() { setModMode( "tremolo" ); } },
    },

    "BUTTON12" : { // tap 1 then 2
      id : 'fsB12Tap',
      Nav : { html : "&rarr;", action : function() { moveCursor( "RIGHT" ); } },
      Tempo : { html : "-", action : function() { } },
      Modifier : { html : "Chorus", action : function() { setModMode( "chorus" ); } },
    },

    "BUTTON21" : {
      id : 'fsB21Tap',
      Nav : { html : "&larr;", action : function() { moveCursor( "LEFT" ); } },
      Tempo : { html : "-", action : function() { } },
      Modifier : { html : "Distortion", action : function() { setModMode( "distortion" ); } },
    },
  },

  "EVENT_DTAP" : {
    "BUTTON1" : {
      id : 'fsB1DTap',
      Tempo : { html : "-", action : function() { } },
      Default : { html : "&#62;", action : function() { playElement( 'START' ); } },
    },
    "BUTTON2" : {
      id : 'fsB2DTap',
      Tempo : { html : "-", action : function() { } },
      Default : { html : "&#8800;", action : function() { playElement( 'STOP' ) } },
    },
  },

  "EVENT_HOLD" : {
    "BUTTON1" : {
      id : 'fsB1Hold',
      Modifier : { html : "Nav", action : function() { setModMode( "off" ); changeMode( "Nav" ); } },
      Tempo : { html : "-", action : function() { } },
      Default :  { html : "Mod", action : function() { changeMode( "Modifier" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Hold',
      Tempo : { html : "-", action : function() { } },
      Default : { html : "Tempo", action : function() { changeMode( "Tempo" ); } }
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
    // button presses need to be accurate and deterministic when setting tempo, so no hold or double tap functions
    if( tapMode == "Tempo" )
    {
      if( newState ) // down.
        buttonEvent( "EVENT_TAP", this.buttonID );
    }
    else if( newState != this.buttonState )
    {
      this.buttonState = newState;

      if( newState ) // true = 'down'
      {
        // Check for 1-2 or 2-1 tap
        var otherButtonIx = ( this.buttonID == "BUTTON1" ) ? 1 : 0;
        if( footSwitchButtons[ otherButtonIx ].pressedState )
        {
          this.clearTimer();
          footSwitchButtons[ otherButtonIx ].clearTimer();
          if( this.buttonID == "BUTTON1" )
            buttonEvent( "EVENT_TAP", "BUTTON21" );
          else
            buttonEvent( "EVENT_TAP", "BUTTON12" );
          footSwitchButtons[ otherButtonIx ].pressedState = false;
          this.pressedState = false;
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
            this.heldFlag = false;
            buttonEvent( "EVENT_DTAP", this.buttonID );
          }
        }
      }
      else // up
      {
        if( this.heldFlag && this.holdTimerExpired ) // do here so you can hold and trigger on release
        {
          buttonEvent( "EVENT_HOLD", this.buttonID );
          this.holdTimerExpired = false;
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

function changeMode( newTapMode )
{
  tapMode = newTapMode;

  for( var e of [ "EVENT_TAP", "EVENT_DTAP", "EVENT_HOLD" ] )
    for( var b of [ "BUTTON1", "BUTTON2", "BUTTON12", "BUTTON21" ] )
    {
      if( fsButtonMap[ e ][ b ] )
        if( fsButtonMap[ e ][ b ][ tapMode ] )
          document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = fsButtonMap[ e ][ b ][ tapMode ].html;
        else if ( fsButtonMap[ e ][ b ][ "Default" ] )
          document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = fsButtonMap[ e ][ b ][ "Default" ].html;
    }
}

var arpeggiatorFlag = false;

function arpeggiatorTog()
{
  arpeggiatorFlag = !arpeggiatorFlag;

  var elem = document.getElementById( 'fsB2Hold' );
  if( arpeggiatorFlag )
    elem.classList.add( 'css_cursor' ); // TBD. this is to highlight that it's on.
  else
    elem.classList.remove( 'css_cursor' );
}

var modFilterState = false;
var modTremoloState = false;
var modChorusState = false;
var modDistState = false;

function setModMode( modifier )
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
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ "BUTTON12" ].id );
      modChorusState = !modChorusState;
      if( modChorusState )
        state = true;
      break;
  
    case "distortion":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ "BUTTON21" ].id );
      modDistState = !modDistState;
      if( modDistState )
        state = true;
      break;

    case "off":
      if( modFilterState ) setModMode( "filter" );
      if( modTremoloState ) setModMode( "tremolo" );
      if( modChorusState ) setModMode( "chorus" );
      if( modDistState ) setModMode( "distortion" );
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
  if( fsButtonMap[ event ][ buttonID ][ tapMode ] )
    fsButtonMap[ event ][ buttonID ][ tapMode ].action();
  else if( fsButtonMap[ event ][ buttonID ][ "Default" ] )
    fsButtonMap[ event ][ buttonID ][ "Default" ].action(); 

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