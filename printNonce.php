<?php
require_once('../wp-load.php');
$nonce = wp_create_nonce('wp_rest');
if (wp_verify_nonce($nonce, 'wp_rest')) echo $nonce;
else echo 'there was an error';

?>