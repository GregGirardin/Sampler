/* Foot switch handling.
   Airturn doesn't allow using both switches at the same time so can't do that.

  In Tempo mode we bypass these features for accuracy.
*/

const MIN_TEMPO_MS = 20; 
const MAX_TEMPO_MS = 2000;

var clickHoldTO = 250; // ms. Can reduce if your down/up is fast enough.

var footSwitchButtons = []; // array of buttons

function initFootswitch()
{
  document.addEventListener( 'keydown', keyPressedHandler );
  document.addEventListener( 'keyup',   keyRelHandler );

  for( var id = 1;id <= 6;id++ )
    footSwitchButtons[ id ] = new FootSwitchButton( id );
  
  changeMode( "NavLR" );
}

/*
  Button Modes: (affect the function of buttons)
    NavUD, NavLR, Modifier, Tempo, Chord
 */

var fsButtonMap =
{
  "EVENT_TAP" : { // Event type.
    1 : { // Event source
      id : 'fsB1Tap',
      NavLR : { html : ">", action : function() { cancelPlayNext();playElement( 'START' ); } },
      NavUD : { html : ">", action : function() { cancelPlayNext();playElement( 'START' );changeMode( "NavLR" ); } },
      Modifier : { html : "Tremolo", action : function() { toggleModifier( "tremolo" ); } },
      Tempo : { html : "-5", action : function() { adjustTempoBPM( -5 ); } },
      Chord : { html : "1", action : function() { playElemIx( 0 ); } },
      Volume : { html : "50%", action : function() { setVolumeLevel( 50 ); } },
    },
    2 : {
      id : 'fsB2Tap',
      Default : { html : "&#8800;", action : function() { playElement( 'STOP' ); } },
      Modifier : { html : "Distortion", action : function() { toggleModifier( "distortion" ); } },
      Tempo : { html : "+5", action : function() { adjustTempoBPM( 5 ); } },
      Chord : { html : "2", action : function() { playElemIx( 1 ); } },
      Volume : { html : "75%", action : function() { setVolumeLevel( 75 ); } },
    },
    3 : {
      id : 'fsB3Tap', // the DOM element to highlight
      Default : { html : "&larr;", action : function() { moveCursor( 'LEFT' ); } },
      NavUD : { html : "&uarr;", action : function() { moveCursor( 'UP' ); } }, // Nav Up down
      Modifier : { html : "Filter", action : function() { toggleModifier( "filter" ); } },
      Tempo : { html : "-1", action : function() { adjustTempoBPM( -1 ); } },
      Chord : { html : "3", action : function() { playElemIx( 2 ); } },
      Volume : { html : "100%", action : function() { setVolumeLevel( 100 ); } },
    },
    4 : {
      id : 'fsB4Tap',
      NavLR : { html : "&rarr;", action : function() { moveCursor( 'RIGHT' ); } },
      NavUD : { html : "&darr;", action : function() { moveCursor( 'DOWN' ); } },
      Modifier : { html : "Chorus", action : function() { toggleModifier( "chorus" ); } },
      Tempo : { html : "+1", action : function() { adjustTempoBPM( 1 ); } },
      Chord : { html : "4", action : function() { playElemIx( 3 ); } },
      Volume : { html : "-5", action : function() { adjustVolumeLevel( -5 ); } },
    },
    5 : {
      id : 'fsB5Tap',
      NavLR : { html : "<<", action : function() { moveCursor( 'PREV' ); } },
      Tempo : { html : "Tap", action : function() { tapTempo(); } }, // tap tempo
      Modifier : { html : "-", action : function() { } },
      Chord : { html : "5", action : function() { playElemIx( 4 ); } },
      Volume : { html : "+5", action : function() { adjustVolumeLevel( 5 ); } },
    },
    6 : {
      id : 'fsB6Tap',
      NavLR : { html : ">>", action : function() { moveCursor( 'NEXT' ); } },
      Tempo : { html : "&larr;&rarr;", action : function() { exitTempoMode();changeMode( "NavLR" ); } },
      Modifier : { html : "&larr;&rarr;", action : function() { toggleModifier( "off" );changeMode( "NavLR" ); } },
      NavUD : { html : "&larr;&rarr;", action : function() { changeMode( "NavLR" ); } },
      Chord : { html : "&larr;&rarr;", action : function() { changeMode( "NavLR" ); } },
      Volume : { html : "&larr;&rarr;", action : function() { changeMode( "NavLR" ); } },
    },
  },

  "EVENT_HOLD" : {
    1 : { id : 'fsB1Hold', },
    2 : {
      id : 'fsB2Hold',
      // NavLR : { html : "FX", action : function() { changeMode( "Modifier" ); } },
    },
    3 : {
      id : 'fsB3Hold',
      NavLR : { html : "&uarr;&darr;", action : function() { changeMode( "NavUD" ); } },
    },
    4 : {
      id : 'fsB4Hold',
      NavLR : { html : "Crd", action : function() { changeMode( "Chord" ); } },
    },
    5 : {
      id : 'fsB5Hold',
      NavLR : { html : "Vol:", action : function() { changeMode( "Volume" ); } }, // "Volume" will get overwritten
    },
    6 : {
      id : 'fsB6Hold',
      NavLR : { html : "Tempo", action : function() { changeMode( "Tempo" ); } },
    },
  },
};

class FootSwitchButton
{
  constructor( identifier )
  {
    this.buttonID = identifier;
    this.buttonState = false;
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

      // Take action on down immediately if there is no HOLD function.
      if( !fsButtonMap[ "EVENT_HOLD" ][ this.buttonID ][ globals.fsMode ] )
      {
        if( newState )
          buttonEvent( "EVENT_TAP", this.buttonID );
      }
      else
      {
        if( newState ) // true = 'down'
        {
          this.holdTimerExpired = false;
          this.holdTimer = setTimeout( holdTimerCB, clickHoldTO, this.buttonID );
        }
        else // released. (up)
        {
          if( this.holdTimerExpired ) 
            this.holdTimerExpired = false;
          else
          {
            this.clearTimer();
            buttonEvent( "EVENT_TAP", this.buttonID );
          }
        }
      }
    }
  }

  holdTimerCB()
  {
    this.holdTimer = undefined;
    this.holdTimerExpired = true;
    buttonEvent( "EVENT_HOLD", this.buttonID );
  }
}

var lastTapTime = undefined;

function tapTempo()
{
  var currentTime = Date.now();

  if( lastTapTime )
  {
    var diff = currentTime - lastTapTime;
    if( ( diff > MIN_TEMPO_MS ) && ( diff < MAX_TEMPO_MS ) )
    {
      configEdited( true );
      setTempoMs( diff );
    }
    lastTapTime = undefined;
  }
  else
    lastTapTime = currentTime;
}

function adjustTempoBPM( bpm )
{
  var tempoBPM = Math.round( 60000 / globals.currentTempo );
  tempoBPM += bpm;
  setTempoMs( 60000 / tempoBPM );
}

function setTempoMs( newTempoMs )
{
  globals.currentTempo = newTempoMs;
  flashTempo();

  if( globals.cfg.groups[ globals.cursor.cg ].tempoMs != newTempoMs )
  {
    globals.cfg.groups[ globals.cursor.cg ].tempoMs = newTempoMs;
    configEdited( true );
  }

  globals.delayBlock.set( { delayTime : globals.currentTempo / 1000 } );
  if( !globals.cfg.groups[ globals.cursor.cg ].tremRate ) // TBD.
    globals.cfg.groups[ globals.cursor.cg ].tremRate = 1;
  globals.tremoloBlock.set( { frequency : 1000 * globals.cfg.groups[ globals.cursor.cg ].tremRate / globals.currentTempo } ) ;

  document.getElementById( "tempoButton" ).innerHTML = Math.round( 60000 / globals.currentTempo ) + " bpm";
}

function exitTempoMode()
{
  lastTapTime = undefined;
}

function holdTimerCB( ButtonID )
{
  footSwitchButtons[ ButtonID ].holdTimerCB();
}

function changeMode( newTapMode )
{
  globals.fsMode = newTapMode;
  
  for( var e of [ "EVENT_TAP", "EVENT_HOLD" ] )
    for( b = 1;b <= 6;b++ )
      if( fsButtonMap[ e ][ b ] )
      {
        var elem = document.getElementById( fsButtonMap[ e ][ b ].id );
        elem.classList.remove( "css_cursor" );
        if( fsButtonMap[ e ][ b ][ globals.fsMode ] )
          elem.innerHTML = fsButtonMap[ e ][ b ][ globals.fsMode ].html;
        else if( fsButtonMap[ e ][ b ][ "Default" ] )
          elem.innerHTML = fsButtonMap[ e ][ b ][ "Default" ].html;
        else 
          elem.innerHTML = '-';
      }
  // if( newTapMode != "Tempo" )
  //   setArpState( -2 );
  if( newTapMode == "Chord" )
    setChordLabels();
}

function setArpState( arpState )
{
  if( arpState == -1 )
    arpState = !globals.cfg.groups[ globals.cursor.cg ].arpFlag;
  else if( arpState == -2 ) // reset to current value to restore HTML
    arpState = globals.cfg.groups[ globals.cursor.cg ].arpFlag;

  globals.cfg.groups[ globals.cursor.cg ].arpFlag = arpState;

  var elem = document.getElementById( fsButtonMap[ "EVENT_HOLD" ][ 5 ].id );
  if( arpState )
    elem.classList.add( "css_cursor" );
  else
    elem.classList.remove( "css_cursor" );
}

function setChordLabels()
{
  if( globals.fsMode != "Chord" )
    return;

  // tbd, fix. Side effect
  for( var e of [ "EVENT_TAP", "EVENT_HOLD" ] )
    for( b = 1;b <= 6;b++ )
      if( fsButtonMap[ e ][ b ] )
      {
        var elem = document.getElementById( fsButtonMap[ e ][ b ].id );
        elem.classList.remove( "css_cursor" );
      }

  var g = globals.cfg.groups[ globals.cursor.cg ];

  for( var crdIx = 1;crdIx <= 5;crdIx++ )
  {
    elem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ crdIx ].id );
    var str = "-";
    if( g.elements[ crdIx - 1 ] )
      str = g.elements[ crdIx - 1 ].elementName;
    
    elem.innerHTML = str;
  }
}

function toggleModifier( modifier )
{
  var domElem;
  var state = false;

  switch( modifier )
  {
    case "tremolo":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ 1 ].id );
      globals.modTremoloState = !globals.modTremoloState;
      if( globals.modTremoloState )
        state = true;
      break;

    case "distortion":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ 2 ].id );
      globals.modDistState = !globals.modDistState;
      if( globals.modDistState )
        state = true;
      break;

    case "filter":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ 3 ].id );
      globals.modFilterState = !globals.modFilterState;
      if( globals.modFilterState )
        state = true;
      break;

    case "chorus":
      domElem = document.getElementById( fsButtonMap[ "EVENT_TAP" ][ 4 ].id );
      globals.modChorusState = !globals.modChorusState;
      if( globals.modChorusState )
        state = true;
      break;

    case "off":
      if( globals.modFilterState ) toggleModifier( "filter" );
      if( globals.modTremoloState ) toggleModifier( "tremolo" );
      if( globals.modChorusState ) toggleModifier( "chorus" );
      if( globals.modDistState ) toggleModifier( "distortion" );
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
  if( fsButtonMap[ event ][ buttonID ][ globals.fsMode ] )
    fsButtonMap[ event ][ buttonID ][ globals.fsMode ].action();
  else if( fsButtonMap[ event ][ buttonID ][ "Default"] )
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

function keyPressedHandler( e )
{
  var ix;

  if( globals.editElement )
    return;

  switch( e.code )
  {
    case 'Digit1': ix = 1;break;
    case 'Digit2': ix = 2;break;
    case 'Digit3': ix = 3;break;
    case 'Digit4': ix = 4;break;
    case 'Digit5': ix = 5;break;
    case 'Digit6': ix = 6;break;
    default:
      return;
  }

  footSwitchButtons[ ix ].setState( true );
}
  
function keyRelHandler( e )
{
  var ix;

  if( globals.editElement )
    return;

  switch( e.code )
  {
    case 'Digit1': ix = 1;break;
    case 'Digit2': ix = 2;break;
    case 'Digit3': ix = 3;break;
    case 'Digit4': ix = 4;break;
    case 'Digit5': ix = 5;break;
    case 'Digit6': ix = 6;break;
    default:
      return;
  }

  footSwitchButtons[ ix ].setState( false );
}

function changeGroup()
{
  var g = globals.cfg.groups[ globals.cursor.cg ];
  setTempoMs( g.tempoMs );
  setArpState( g.arpFlag );
  fsButtonMap[ "EVENT_HOLD" ][ 5 ].NavLR.html = "Vol:" + g.masterLevel; 
}

function moveCursor( dir )
{
  var c = globals.cursor; // c is cursor, just for readability.
  var gLen = globals.cfg.groups[ c.cg ].elements.length;

  var prevGrp = c.cg;

  switch( dir )
  {
    case 'UP': // prv group.
      if( c.cg > 0 )
      {
        c.cg -= 1;
        while( globals.cfg.groups[ c.cg ].chained && c.cg )
          c.cg -= 1;

        c.ce = undefined; // almost certain want to start from the beginning
        changeGroup();
      }
      break;

    case 'DOWN': // Next group (skip chain )
      if( c.cg < globals.cfg.groups.length - 2 )
      {
        var found = false;
        var tmpGrp = c.cg += 1;
        while( globals.cfg.groups[ tmpGrp ].chained && c.cg < globals.cfg.groups.length )
          tmpGrp += 1;

        if( tmpGrp < globals.cfg.groups.length )
        {
          c.cg = tmpGrp;
          c.ce = undefined;

          changeGroup();
        }
      }
      break;

    case 'LEFT':
      if( c.ce ) // We don't wrap going back.
        c.ce -= 1;
      break;

    case 'RIGHT':
      if( c.ce == undefined )
        c.ce = 0;
      else
      {
        c.ce += 1;
        if( c.ce == gLen )
          c.ce = 0; // go to start
      }
      break;

    case 'NEXT': // next part. (Group chained to a song)
      if( ( globals.cfg.groups[ c.cg + 1 ].chained ) && ( c.cg < globals.cfg.groups.length - 1 ) )
      {
        if( c.ce != undefined )
          c.cg += 1;
        c.ce = 0;
        globals.stopFlag = false;
        changeGroup();
      }
      break;

    case 'PREV': // prev part
      if( globals.cfg.groups[ c.cg ].chained && c.cg > 0 )
      {
        c.cg -= 1;
        c.ce = 0;
        globals.stopFlag = false;

        changeGroup();
      }
      break;
  }

  if( prevGrp != c.cg )
    crdPlaying = undefined; // in Chord mode, moving groups means tapping any chord plays it
                            // normally tapping the playing chord stops it.
  changeMode( globals.fsMode ); // no change, setting HTML
  genElementConfigHTML();
}