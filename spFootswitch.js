/* Foot switch handling for two buttons. Assume the buttons are mapped to UP and DOWN.
   8 functions: Tap L+R, Double Tap L+R, Hold L+R, Both Tap, Both hold

          | Start Timer       clickHoldTO
  Time -----------------------|   Trigger Hold at 'up' for determinism.
B1  ______/-------------------|---\_ Hold
    ______/----------\________| Single Tap
    ______/--\___/ <- Double Tap 
          ^--- Button pressed
B2 ___________________________|

***

B1  ______/-------------------| Both Hold
B2  ___________/--------------|

***

B1  ______/-----------*-\____
B2  ______/--------\ <-- Both Tap

In Tempo mode we bypass these features for accuracy.
*/
const clickHoldTO = 250;

var footSwitchButtons = []; // array of buttons
var bothHeldTimer;

var tapMode = "NavLR";

var fsButtonMap = 
{
  "EVENT_TAP" : { // Event type.
    "BUTTON1" : { // Event source
      id : 'fsB1Tap', // the DOM element to highlight
      NavLR : { html : "&larr;", action : function() { moveCursor( 'LEFT' ); } }, // Nav Left right
      NavUD : { html : "&uarr;", action : function() { moveCursor( 'UP' ); } },   // Nav Up down
      Tempo : { html :    "Tap", action : function() { tapTempo(); } }, // tap tempo
      Filter : { html : "Filter Low", action : function() { doFilterAction( "low" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Tap',
      NavLR : { html : "&rarr;", action : function() { moveCursor( 'RIGHT' ); } },
      NavUD : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
      Tempo : { html :    "Set", action : function() { exitTempoMode(); } },
      Filter : { html : "Filter Hi", action : function() { doFilterAction( "hi" ); } }, 
    },
    "BUTTONB" : { 
      id : 'fsBBTap',
      NavLR : { html : "&uarr;&darr;", action : function() { changeTapMode( "NavUD" ); } },
      NavUD : { html : "&larr;&rarr;", action : function() { changeTapMode( "NavLR" ); } },
      Tempo : { html : "-", action : function() { } }, // No 'both' in Tempo mode
      Filter : { html : "Toggle", action : function() { doFilterAction( "type" ); } }, 
    },
  },

  "EVENT_DTAP" : {
    "BUTTON1" : {
      id : 'fsB1DTap',
      Default : { html : "&#62;", action : function() { playElement( 'START' ); } },
    },
    "BUTTON2" : {
      id : 'fsB2DTap',
      Default : { html : "&#8800;", action : function() { playElement( 'STOP' ) } },
    },
      "BUTTONB" : { } // No Double tap of both
  },

  "EVENT_HOLD" : {
    "BUTTON1" : {
      id : 'fsB1Hold',
      Filter :   { html : "NavLR", action : function()
        {
          doFilterAction( "off" );
          changeTapMode( "NavLR" );
        } },
      Default :  { html : "Filter", action : function() { changeTapMode( "Filter" ); } },
    },
    "BUTTON2" : {
      id : 'fsB2Hold',
      Default :  { html : "Arp", action : function() { arpeggiatorTog() } },
    },
    "BUTTONB" : {
      id : 'fsBBHold',
      Default : { html : "Tempo", action : function() { changeTapMode( "Tempo" ); } }
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
    if( tapMode == "tempo" )
      buttonEvent( "EVENT_TAP", this.buttonID );
    else if( newState != this.buttonState )
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

var lastTapTime = undefined;
const MIN_TEMPO_MS = 20;
const MAX_TEMPO_MS = 2000;
function tapTempo()
{
  var currentTime = Date.now();

  if( lastTapTime )
  {
    var diff;

    diff = currentTime - lastTapTime;
    if( ( diff > MIN_TEMPO_MS ) && ( diff < MAX_TEMPO_MS ) )
    {
      setTempoMs( diff );
      delayBlock.set( { delayTime : currentTempo / 1000 } );
      tremoloBlock.set( { frequency : 1000 / currentTempo } ) ;
      document.getElementById( "tempoButton" ).innerHTML = Math.round( 60000 / currentTempo ) + " bpm";
    }
  }
  lastTapTime = currentTime;
}

function setTempoMs( newTempoMs )
{
  currentTempo = newTempoMs;

  // tell the arpeggiator.
  arpSetTempo( currentTempo );
}

function exitTempoMode()
{
  lastTapTime = undefined;
  changeTapMode( "NavLR" );
}

function holdTimerCB( ButtonID )
{
  footSwitchButtons[ ( ButtonID == "BUTTON1" ) ? 0 : 1 ].holdTimerCB();
}

function changeTapMode( newTapMode )
{
  tapMode = newTapMode;

  for( var e of [ "EVENT_TAP", "EVENT_DTAP", "EVENT_HOLD" ] )
    for( var b of [ "BUTTON1", "BUTTON2", "BUTTONB" ] )
    {
      if( fsButtonMap[ e ][ b ][ tapMode ] )
        document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = fsButtonMap[ e ][ b ][ tapMode ].html;
      else if ( fsButtonMap[ e ][ b ][ "Default" ] )
        document.getElementById( fsButtonMap[ e ][ b ].id ).innerHTML = fsButtonMap[ e ][ b ][ "Default" ].html;
    }
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

function bothHoldTimerCB() // Both buttons were held.
{
  bothHeldTimer = undefined; // clear. It's used as a flag below.
  buttonEvent( "EVENT_HOLD", "BUTTONB" );
  footSwitchButtons[ 0 ].pressedState = false;
  footSwitchButtons[ 1 ].pressedState = false;
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
        cursorGroup -= 1;
      break;

    case 'DOWN':
      if( cursorGroup < curConfig.groups.length - 2 )
        cursorGroup += 1;
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