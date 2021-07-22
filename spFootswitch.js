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
                      
*/
const clickHoldTO = 250;

var footSwitchButtons = []; // array of buttons
var bothHeldTimer;

var fsMode = "PM"; // Play Mode. May add other modes if necessary.

var fsButtonMap = 
{
  "EVENT_TAP" : { // Event type
    "BUTTON1" : { // Event source
      id : 'fsB1Tap', // the DOM element to highlight
      PM : { html : "&larr;", action : function() { moveCursor( 'LEFT' ); } }, // performance mode info
    },
    "BUTTON2" : {
      id : 'fsB2Tap',
      PM : { html : "&rarr;", action : function() { moveCursor( 'RIGHT' ); } },
    },
    "BUTTONB" : { 
      id : 'fsBBTap',
      PM : { html : "&rarr&rarr;", action : function() { moveCursor( 'START' );} },
    },
  },

  "EVENT_DTAP" : {
    "BUTTON1" : {
      id : 'fsB1DTap',
      PM : { html : "&#62;", action : function() { playElement( 'START' ); } },
    },
    "BUTTON2" : {
      id : 'fsB2DTap',
      PM : { html : "#8800;", action : function() { playElement( 'STOP' ) } },
    },
    // No Double tap of both
  },

  "EVENT_HOLD" : {
    "BUTTON1" : {
      id : 'fsB1Hold',
      PM :  { html : "&uarr;", action : function() { moveCursor( 'UP' ); } }, 
    },
    "BUTTON2" : {
      id : 'fsB2Hold',
      PM : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
    },
    "BUTTONB" : {
      id : 'fsBBHold',
      PM : { html :   "Play", action : function() { moveCursor( 'TOP' ); } },
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