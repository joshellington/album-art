'use strict';

( ( root, cx ) => {

	if ( typeof define === 'function' && define.amd ) {

		// AMD
		define( ['isomorphic-fetch'], cx )

	} else if ( typeof exports === 'object' ) {

		// Node, CommonJS-like
		module.exports = cx( require( 'isomorphic-fetch' ) )

	} else {

		// Browser globals (root is window)
		root.albumArt = cx( root.fetch )

	}

} )( this, fetch => {

	const albumArt = async ( query, options, cb ) => {

		// Massage inputs
		if ( typeof query !== 'string' ) {

			throw new TypeError( 'Expected search query to be a string' )

		}

		if ( typeof options === 'function' ) {

			cb = options
			options = null

		}

		if ( typeof cb !== 'function' ) {

			cb = null

		}

		// Default options
		query = query.replace( '&', 'and' )
		const opts = Object.assign( {
			album: null,
			size: null
		}, options )

		// Image size options
		const SIZES = {
			SMALL: 'small',
			MEDIUM: 'medium',
			LARGE: 'large'
		}

		// Public Key on purpose - don't make me regret this
		const apiEndpoint = 'https://api.spotify.com/v1'
		const authEndpoint = 'https://accounts.spotify.com/api/token'
		const clientId = 'aa4894a97e78479d9f966138bac365ff'
		const clientSecret = '4ada8f256a524c50b929d762d83aa7b4'

		// Create request URL
		const methods = 'track,artist'
		const queryParams = `?q=${encodeURIComponent( query )}&type=${methods}&limit=1`
		const searchUrl = `${apiEndpoint}/search${queryParams}`
		const authString = `${clientId}:${clientSecret}`

		let authorization
		if ( typeof btoa !== 'undefined' ) {

			authorization = btoa( authString )

		} else if ( Buffer ) {

			authorization = Buffer.from( authString ).toString( 'base64' )

		} else {

			throw new Error( 'No suitable environment found' )

		}

		// Start by authorizing a session
		const authToken = await fetch( authEndpoint, {
			method: 'post',
			body: 'grant_type=client_credentials',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${authorization}`
			}
		} )
			.then(
				res => res.json()
			)
			.then(
				json => json.access_token
			)

		// Perform image search
		let error = null
		const response = await fetch( searchUrl, {
			method: 'get',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Bearer ${authToken}`
			}
		} )
			.then(
				res => res.json()
			)
			.then(
				json => {

					if ( typeof ( json.error ) !== 'undefined' ) {

						// Error
						return Promise.reject( new Error( `JSON - ${json.error} ${json.message}` ) )

					}

					if (json.tracks.items.length && json.tracks.items[0].album) {
						return json.tracks.items[0].album.images[0].url
					}

					if (json.artists.items.length && json.artists.items[0].images) {
						return json.artists.items[0].images[0].url
					}

					return Promise.reject( new Error( 'No results found' ) )

				}
			)
			.catch( error_ => {

				error = error_
				return error_

			} )

		// Callback
		if ( cb ) {

			return cb( error, response )

		}

		// Promise
		return response

	}

	// Exposed public method
	return albumArt

} )
