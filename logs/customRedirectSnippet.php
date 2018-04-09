<?php

function custom404Redirection( $wp ) {
  
  
  	if (is_404){
  
	  $redirects = array(
		  array('regex' => '/^events?/', 'redirect' => home_url( user_trailingslashit( 'calendar' ) ))
	  );

	  $dateCategoryRedirects = [
		  'news',
		  'arts',
		  'music',
		  'features'
	  ];


	  foreach ($redirects as $redirect){
		  if (preg_match( $redirect['regex'], $wp->request ) ) {
			wp_redirect($redirect['redirect']);
			exit;
		}	
	  }

	  foreach($dateCategoryRedirects as $category){
		if (preg_match('/\d{4}-\d{2}-\d{2}\/' . $category . '/', $wp->request)){
			wp_redirect(home_url( user_trailingslashit( 'category/' . $category )));
			exit;
		}
	  }
	}
}

add_action( 'wp', 'custom404Redirection' );

?>