// Functions that generation HTML content.

/////////////// /////////////// /////////////// ///////////////
function genElementConfigHTML()
{
  var l = globals.cfg.groups.length;

  if( l == 1 && !l )
    globals.cursor.cg = undefined;
  else
  {
    if( globals.cursor.cg == undefined )
      globals.cursor.cg = 0;
    if( globals.cursor.cg >= l - 1 )
      globals.cursor.cg = l - 2;

    l = globals.cfg.groups[ globals.cursor.cg ].elements.length;
    if( globals.cursor.ce >= l )
      globals.cursor.ce = l - 1;
    else if( ( globals.cursor.ce < 0 ) && ( l > 0 ) )
      globals.cursor.ce = 0;
  }

  var tempHtml = ""; // "<div id='sampleListName' onClick='setSampleConfigName()'>" + globals.cfg.name + "</div><br>";

  for( var i = 0;i < globals.cfg.groups.length;i++ )
  {
    var g = globals.cfg.groups[ i ];
    var classes = "css_groupClass";

    if( i && !g.chained )
      tempHtml += "<br>\n";
    switch( g.seqMode )
    {
      case "None": break;
      case "Manual": classes += ' css_groupSeqMan'; break;
      case "Cont": classes += ' css_groupSeqCont'; break;
    }

    if( g.chained )
      tempHtml += "<button id='slGroup." + i + "' class='css_groupClass' onclick='groupClick( " + i + " )' draggable='true' " +
                  "ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>:</button>\n";
    else if( i == globals.cfg.groups.length - 1 )
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
      if( g.elements[ j ].objType == "CChordRef" )
        classes += " css_Chord";
      else if( g.elements[ j ].objType == "CSample" )
        classes += " css_Sample";

      tempHtml += "<button id='slElement." + i + "." + j + "' class='" + classes + "' onclick='elemClick( " + i + ", " + j + " )'" +
                  " draggable='true' ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )''>" +
                  g.elements[ j ].elementName + "</button>\n";
    }
    tempHtml += "<button id='slElement." + i + "." + j + "' class='css_slElement' onclick='addToGroup( " + i + " )'" +
                "  ondrop='dropElem( event )' ondragover='sl_allowDrop( event )' ondragstart='dragElem( event )'>&nbsp+&nbsp</button>\n";
  }

  tempHtml += "<br><button onclick='groupAdd()'> Add Group </button>\n<br>\n<br>";
  tempHtml += "<input id='trashCan' type='image' ondragover='sl_allowDrop( event )' ondrop='dropElem( event )' src='" + serverURL + "images/trashcan.png'/>\n";

  document.getElementById( 'audioElements' ).innerHTML = tempHtml;

  if( globals.configEditedFlag || globals.chordEditedFlag )
    document.getElementById( 'saveConfigButton' ).classList.add( 'css_highlight_red' );
  else
    document.getElementById( 'saveConfigButton' ).classList.remove( 'css_highlight_red' );

  var elem;
  if( globals.cursor.cg >= 0 && globals.cursor.ce >= 0 )
    elem = document.getElementById( 'slElement.' + globals.cursor.cg + '.' + globals.cursor.ce );
  else if( globals.cursor.cg )
    elem = document.getElementById( 'slGroup.' + globals.cursor.cg );
  if( elem )
    elem.classList.add( 'css_cursor' );
}

/////////////// /////////////// /////////////// ///////////////
// Generate the "Sample Library".
// The list of samples from the library that can be dragged into the set list 
/////////////// /////////////// /////////////// ///////////////
function generateLibraryHTML()
{
  var t = []; // Array for sorting.

  for( const[ key, value ] of Object.entries( globals.sampleLibrary ) )
    t.push( value );
  t.sort( function( a, b ){ return ( a.displayName > b.displayName ) ? 1 : -1 } );

  var tempHtml = "";
  if( !t.length )
    tempHtml += "<h2>No Sample Library.</h2>";
  else
    for( var i = 0;i < t.length;i++ )
      tempHtml += "<button id='libSample." + t[ i ].displayName +
                 "' class='css_librarySample' draggable='true' ondragstart='dragElem( event )'" + 
                  "onclick='libSampleClick( \"" + t[ i ].displayName + "\")'>" + t[ i ].displayName + "</button>\n";

  document.getElementById( 'libraryDiv' ).innerHTML = tempHtml;
}

/////////////// /////////////// ///////////////
/////////////// /////////////// ///////////////
function genEditGroupHTML()
{
  var tempHtml = "Name: <input contenteditable='true' id='editGroupName' value='" + globals.editElement.elementName + "'>";

  c = globals.editElement.chained ? "checked" : "";
  tempHtml += "<br>Chain: <input type='checkbox' id='editGroupChain' " + c + "><br>";

  tempHtml += "Instrument:<select id='editGroupInstrument'>";

  for( i = 0;i < CGlobals.synthTypes.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.synthTypes[ i ] + "' ";
    if( globals.editElement.instrument == CGlobals.synthTypes[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.synthTypes[ i ] + "</option>";
  }
  tempHtml += "</select>";

  var c = globals.editElement.thickenFlag ? "checked" : "";
  tempHtml += "<br>Thicken: <input type='checkbox' id='editGroupThickenFlag' " + c + "><br>";

  var tempoBPM = Math.round( 60000 / globals.editElement.tempoMs );

  tempHtml += "Tempo: <input type='number' id='editGroupTempoBPM' min='20' max='300' value='" + tempoBPM + "'><br>";

  tempHtml += "Sequence Mode:";

  for( i = 0;i < CGlobals.seqModes.length;i++ )
    tempHtml += "<input type='radio' id='editGroupSequenceMode" + i + "' name='sequenceType'" +
               ( globals.editElement.seqMode == CGlobals.seqModes[ i ] ? "checked" : "") + ">" + CGlobals.seqModes[ i ];

  tempHtml += "<br>Envelope:<select id='editGroupEnvelope'>";
  for( i = 0;i < CGlobals.envelopeLabels.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.envelopeLabels[ i ] + "' ";
    if( globals.editElement.envelope == CGlobals.envelopeLabels[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.envelopeLabels[ i ] + "</option>";
  }
  tempHtml += "</select><br>";

  tempHtml += "Arp Sequence:<select id='editGroupArpSequence'>";
  for( i = 0;i < CGlobals.arpSequences.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.arpSequences[ i ] + "' ";
    if( globals.editElement.arpSequence == CGlobals.arpSequences[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.arpSequences[ i ] + "</option>";
  }
  tempHtml += "</select>";

  c = globals.editElement.arpFlag ? "checked" : "";
  tempHtml += "<br>Arp: <input type='checkbox' id='editGroupArpFlag' " + c + "><br>";

  tempHtml += "Arp Notes/b:<select id='editGroupArpNPB'>";
  for( i = 0;i < CGlobals.arpNPBs.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.arpNPBs[ i ] + "' ";
    if( globals.editElement.arpNPB == CGlobals.arpNPBs[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.arpNPBs[ i ] + "</option>";
  }
  tempHtml += "</select><br>";

  tempHtml += "Tremolo factor:<select id='editGroupTremRate'>";
  for( i = 0;i < CGlobals.tremRates.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.tremRates[ i ] + "' ";
    if( globals.editElement.tremRate == CGlobals.tremRates[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.tremRates[ i ] + "</option>";
  }
  tempHtml += "</select><br>";

  tempHtml += "Master: <input type='range' id='editGroupMasterLevel' min='0' max='100' value='" + globals.editElement.masterLevel + "'><br>";
  tempHtml += "Chorus: <input type='range' id='editGroupChorusLevel' min='0' max='100' value='" + globals.editElement.chorusLevel + "'><br>";
  tempHtml += "Phaser: <input type='range' id='editGroupPhaserLevel' min='0' max='100' value='" + globals.editElement.phaserLevel + "'><br>";
  tempHtml += "Tremolo: <input type='range' id='editGroupTremoloLevel' min='0' max='100' value='" + globals.editElement.tremoloLevel + "'><br>";
  tempHtml += "Dist: <input type='range' id='editGroupDistortionLevel' min='0' max='100' value='" + globals.editElement.distortionLevel + "'><br>";
  tempHtml += "Dry: <input type='range' id='editGroupDryLevel' min='0' max='100' value='" + globals.editElement.dryLevel + "'><br>";
  tempHtml += "Delay: <input type='range' id='editGroupDelayLevel' min='0' max='100' value='" + globals.editElement.delayLevel + "'><br>";
  tempHtml += "Reverb: <input type='range' id='editGroupReverbLevel' min='0' max='100' value='" + globals.editElement.reverbLevel + "'><br>";

  document.getElementById( 'multiuse' ).innerHTML = tempHtml;
}

//////////////////////////// ////////////////////////////
function genEditSampleHTML()
{
  var tempHtml = "<hr>";

  tempHtml += "Display Name: <input id='editSampleName' contenteditable='true' value='" + globals.editElement.elementName + "'><br>";
  tempHtml += "File: " + globals.editElement.filename + "<br>";
  var checked = globals.editElement.loopFlag ? "checked" : "";
  tempHtml += "Loop: <input type='checkbox' id='editSampleLoopFlag' " + checked + ">";

  document.getElementById( 'multiuse' ).innerHTML = tempHtml;
}

//////////////////////////// ////////////////////////////
function genEditChordHTML()
{
  var tempHtml = "Name: <input contenteditable='true' id='editChordName' value='" + globals.editElement.elementName + "'><br>";

  tempHtml += "Play beats:<select id='editChordBeats'>";

  for( i = 0;i < CGlobals.playBeats.length;i++ )
  {
    tempHtml += "<option value='" + CGlobals.playBeats[ i ] + "' ";
    if( globals.editElement.playBeats == CGlobals.playBeats[ i ] )
      tempHtml += "selected='selected'";
    tempHtml += ">" + CGlobals.playBeats[ i ] + "</option>";
  }
  tempHtml += "</select><br>";

  tempHtml += "Octave:<select id='editChordOctave'>";
  for( i = 3;i >= -3;i-- )
  {
    tempHtml += "<option value='" + i + "' ";
    if( globals.editElement.octave == i )
      tempHtml += "selected='selected'";
    tempHtml += ">" + i + "</option>";
  }
  tempHtml += "</select>";

  tempHtml += "<div class='css_keyboard'><br>";

  const noteNames = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
  const blackKeys = [         1,         3,              6,         8,        10 ];

  // Two octave keyboard
  for( var note = 0;note < 32;note++ )
  {
    var css_class = ( blackKeys.includes( note % 12 ) ) ? 'css_blackKey' : 'css_whiteKey';

    if( ( 1 << note ) & globals.editElement.notes )
      css_class += ' css_pressedKey';

    tempHtml += "<button id='keyboardKey_" + note + "' class='" + css_class +
               "' onclick='keyboardPressed( " + note + " );'>" + noteNames[ note % 12 ] + "</button>";
  }
  tempHtml += "<br><br></div>";
  tempHtml += "<br><button onclick='cloneChord()'> Clone </button>\n<br>\n<br>";

  document.getElementById( 'multiuse' ).innerHTML = tempHtml;
}

//////////////////////////// ////////////////////////////
function saveEdits()
{
  if( globals.editElement )
    switch( globals.editElement.objType )
    {
      case "CSample":
        globals.editElement.elementName   = document.getElementById( "editSampleName" ).value; 
        globals.editElement.loopFlag      = document.getElementById( "editSampleLoopFlag" ).checked;
        break;
    
      case "CGroup":
        globals.editElement.chained = document.getElementById( "editGroupChain" ).checked;
        globals.editElement.elementName = document.getElementById( "editGroupName" ).value;
        globals.editElement.instrument  = document.getElementById( "editGroupInstrument" ).value;
        globals.editElement.thickenFlag = document.getElementById( "editGroupThickenFlag" ).checked;

        globals.editElement.tempoMs = 60000 / parseInt( document.getElementById( "editGroupTempoBPM" ).value );

        for( var i = 0;i < CGlobals.seqModes.length;i++ )
        {
          var str = "editGroupSequenceMode" + i;
          if( document.getElementById( str ).checked )
          {
            globals.editElement.seqMode = CGlobals.seqModes[ i ];
            break;
          }
        }

        globals.editElement.envelope        = document.getElementById( "editGroupEnvelope" ).value;
        globals.editElement.arpFlag         = document.getElementById( "editGroupArpFlag" ).checked;
        globals.editElement.arpNPB          = parseInt( document.getElementById( "editGroupArpNPB" ).value );
        globals.editElement.tremRate        = parseInt( document.getElementById( "editGroupTremRate" ).value );
        globals.editElement.arpSequence     = document.getElementById( "editGroupArpSequence" ).value;
        globals.editElement.masterLevel     = parseInt( document.getElementById( "editGroupMasterLevel" ).value );
        globals.editElement.distortionLevel = parseInt( document.getElementById( "editGroupDistortionLevel" ).value );
        globals.editElement.chorusLevel     = parseInt( document.getElementById( "editGroupChorusLevel" ).value );
        globals.editElement.phaserLevel     = parseInt( document.getElementById( "editGroupPhaserLevel" ).value );
        globals.editElement.tremoloLevel    = parseInt( document.getElementById( "editGroupTremoloLevel" ).value );
        globals.editElement.dryLevel        = parseInt( document.getElementById( "editGroupDryLevel" ).value );
        globals.editElement.delayLevel      = parseInt( document.getElementById( "editGroupDelayLevel" ).value );
        globals.editElement.reverbLevel     = parseInt( document.getElementById( "editGroupReverbLevel" ).value );
        break;

      case "CChord":
        globals.editElement.elementName   = document.getElementById( "editChordName" ).value;
        globals.editElement.playBeats     = parseInt( document.getElementById( "editChordBeats" ).value );
        globals.editElement.octave        = parseInt( document.getElementById( "editChordOctave" ).value );

        break;
    }

  globals.configEditedFlag = true;

  globals.editElement = undefined;
  document.getElementById( 'multiuse' ).innerHTML = "";

  genElementConfigHTML();
}