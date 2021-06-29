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

function keyPressed( note )
{
  var pressed = ( ( 1 << note ) & editElement.notes );

  if( pressed )
    editElement.notes &= ~( 1 << note ); // clear
  else
    editElement.notes |= ( 1 << note );

  drawKeyboard();
}