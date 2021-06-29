// Functions that generation HTML content.

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