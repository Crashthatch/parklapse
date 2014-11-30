<?php
//error_reporting( E_ALL );
//ini_set('display_errors', true);

$startDate = $_REQUEST['startDate'];
$endDate = $_REQUEST['endDate'];

if( !$startDate || !$endDate ){
    die( "Need startDate and endDate in GET params");
}

$historicalDecoded = array();

$ch = curl_init('http://data.bathhacked.org/resource/x29s-cczc.json?$select=name,lastupdate,occupancy&$where=lastupdate%3E%27'.$startDate.'%27%20AND%20lastupdate%3C%27'.$endDate.'%27&$limit=10000&$offset=0');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$historicalResult = curl_exec($ch);

//$historicalResult = file_get_contents();
$historicalDecoded = json_decode( $historicalResult, true );

foreach( $historicalDecoded as $key => $result ){
    $historicalDecoded[$key]['occupancy'] = $result['occupancy']*1.0;
}

header('Content-type: application/json');
echo json_encode($historicalDecoded);

?>